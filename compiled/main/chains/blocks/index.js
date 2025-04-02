"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const electron_log_1 = __importDefault(require("electron-log"));
class BlockMonitor extends events_1.EventEmitter {
    constructor(connection) {
        super();
        this.start = this.start.bind(this);
        this.stop = this.stop.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.handleBlock = this.handleBlock.bind(this);
        this.getLatestBlock = this.getLatestBlock.bind(this);
        this.connection = connection;
        this.subscriptionId = '';
        this.latestBlock = '0x0';
        this.connection.on('connect', this.start);
        this.connection.on('close', this.stop);
    }
    start() {
        electron_log_1.default.verbose(`%cStarting block updates for chain ${this.chainId}`, 'color: green');
        this.connection.on('message', this.handleMessage);
        // load the latest block first on connect, then start checking for new blocks
        this.getLatestBlock();
        this.connection
            .send({ id: 1, jsonrpc: '2.0', method: 'eth_subscribe', params: ['newHeads'] })
            .then((subId) => (this.subscriptionId = subId))
            .catch(() => {
            // subscriptions are not supported, poll for block changes instead
            this.clearSubscription();
            this.poller = setInterval(this.getLatestBlock, 15 * 1000);
        });
    }
    stop() {
        electron_log_1.default.verbose(`%cStopping block updates for chain ${this.chainId}`, 'color: red');
        if (this.subscriptionId) {
            this.clearSubscription();
        }
        if (this.poller) {
            this.stopPoller();
        }
    }
    get chainId() {
        return parseInt(this.connection.chainId, 16);
    }
    clearSubscription() {
        this.connection.off('message', this.handleMessage);
        this.subscriptionId = '';
    }
    stopPoller() {
        clearInterval(this.poller);
        this.poller = undefined;
    }
    getLatestBlock() {
        this.connection
            .send({ id: 1, jsonrpc: '2.0', method: 'eth_getBlockByNumber', params: ['latest', false] })
            .then((block) => this.handleBlock(block))
            .catch((err) => this.handleError(`Could not load block for chain ${this.chainId}`, err));
    }
    handleMessage(message) {
        if (message.type === 'eth_subscription' && message.data.subscription === this.subscriptionId) {
            this.handleBlock(message.data.result);
        }
    }
    handleBlock(blockUpdate) {
        if (!blockUpdate || typeof blockUpdate !== 'object') {
            return this.handleError(`Received invalid block on chain ${this.chainId}`);
        }
        const block = blockUpdate;
        electron_log_1.default.debug(`%cReceived block ${parseInt(block.number)} for chain ${this.chainId}`, 'color: yellow', {
            latestBlock: parseInt(this.latestBlock)
        });
        if (block.number !== this.latestBlock) {
            this.latestBlock = block.number;
            this.connection.emit('status', 'connected');
            this.emit('data', block);
        }
    }
    handleError(...args) {
        this.connection.emit('status', 'degraded');
        electron_log_1.default.error(...args);
    }
}
exports.default = BlockMonitor;
