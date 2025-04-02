"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
const uuid_1 = require("uuid");
const internalOriginId = (0, uuid_1.v5)('frame-internal', uuid_1.v5.DNS);
class ProviderProxyConnection extends stream_1.EventEmitter {
    constructor() {
        super();
        process.nextTick(() => this.emit('connect'));
    }
    async send(payload) {
        if (payload.method === 'eth_subscribe') {
            this.emit('provider:subscribe', { ...payload, _origin: internalOriginId });
        }
        else {
            this.emit('provider:send', { ...payload, _origin: internalOriginId });
        }
    }
    close() {
        this.emit('close');
    }
}
exports.default = new ProviderProxyConnection();
