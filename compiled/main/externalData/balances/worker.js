"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_log_1 = __importDefault(require("electron-log"));
const eth_provider_1 = __importDefault(require("eth-provider"));
electron_log_1.default.transports.console.format = '[scanWorker] {h}:{i}:{s}.{ms} {text}';
electron_log_1.default.transports.console.level = process.env.LOG_WORKER ? 'debug' : 'info';
electron_log_1.default.transports.file.level = ['development', 'test'].includes(process.env.NODE_ENV || 'development')
    ? false
    : 'verbose';
const multicall_1 = require("../../multicall");
const scan_1 = __importDefault(require("./scan"));
const tokens_1 = __importDefault(require("../inventory/tokens"));
const balance_1 = require("../../../resources/domain/balance");
let heartbeat;
let balances;
const eth = (0, eth_provider_1.default)('frame', { origin: 'frame-internal', name: 'scanWorker' });
const tokenLoader = new tokens_1.default();
eth.on('error', (e) => {
    electron_log_1.default.error('Error in balances worker', e);
    disconnect();
});
eth.on('connect', async () => {
    await tokenLoader.start();
    balances = (0, scan_1.default)(eth);
    sendToMainProcess({ type: 'ready' });
});
async function getChains() {
    try {
        const chains = await eth.request({ method: 'wallet_getChains' });
        return chains.map((chain) => parseInt(chain));
    }
    catch (e) {
        electron_log_1.default.error('could not load chains', e);
        return [];
    }
}
function sendToMainProcess(data) {
    if (process.send) {
        return process.send(data);
    }
    else {
        electron_log_1.default.error(`cannot send to main process! connected: ${process.connected}`);
    }
}
async function updateBlacklist(address, chains) {
    try {
        const blacklistTokens = tokenLoader.getBlacklist(chains);
        sendToMainProcess({ type: 'tokenBlacklist', address, tokens: blacklistTokens });
    }
    catch (e) {
        electron_log_1.default.error('error updating token blacklist', e);
    }
}
async function tokenBalanceScan(address, tokensToOmit = [], chains) {
    try {
        // for chains that support multicall, we can attempt to load every token that we know about,
        // for all other chains we need to call each contract individually so don't scan every contract
        const omitSet = new Set(tokensToOmit.map(balance_1.toTokenId));
        const eligibleChains = (chains || (await getChains())).filter(multicall_1.supportsChain);
        const tokenList = tokenLoader.getTokens(eligibleChains);
        const tokens = tokenList.filter((token) => !omitSet.has((0, balance_1.toTokenId)(token)));
        const tokenBalances = (await balances.getTokenBalances(address, tokens)).filter((balance) => parseInt(balance.balance) > 0);
        sendToMainProcess({ type: 'tokenBalances', address, balances: tokenBalances });
    }
    catch (e) {
        electron_log_1.default.error('error scanning for token balances', e);
    }
}
async function fetchTokenBalances(address, tokens) {
    try {
        const blacklistSet = new Set(tokenLoader.getBlacklist().map(balance_1.toTokenId));
        const filteredTokens = tokens.filter((token) => !blacklistSet.has((0, balance_1.toTokenId)(token)));
        const tokenBalances = await balances.getTokenBalances(address, filteredTokens);
        sendToMainProcess({ type: 'tokenBalances', address, balances: tokenBalances });
    }
    catch (e) {
        electron_log_1.default.error('error fetching token balances', e);
    }
}
async function chainBalanceScan(address, chains) {
    try {
        const availableChains = chains || (await getChains());
        const chainBalances = await balances.getCurrencyBalances(address, availableChains);
        sendToMainProcess({ type: 'chainBalances', balances: chainBalances, address });
    }
    catch (e) {
        electron_log_1.default.error('error scanning chain balance', e);
    }
}
function disconnect() {
    process.disconnect();
    process.kill(process.pid, 'SIGHUP');
}
function resetHeartbeat() {
    clearTimeout(heartbeat);
    heartbeat = setTimeout(() => {
        electron_log_1.default.warn('no heartbeat received in 60 seconds, worker exiting');
        disconnect();
    }, 60 * 1000);
}
const messageHandler = {
    updateChainBalance: chainBalanceScan,
    fetchTokenBalances: fetchTokenBalances,
    heartbeat: resetHeartbeat,
    tokenBalanceScan: (address, tokensToOmit, chains) => {
        updateBlacklist(address, chains);
        tokenBalanceScan(address, tokensToOmit, chains);
    }
};
process.on('message', (message) => {
    electron_log_1.default.debug(`received message: ${message.command} [${message.args}]`);
    const args = message.args || [];
    messageHandler[message.command](...args);
});
