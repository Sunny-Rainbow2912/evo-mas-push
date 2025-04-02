"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const electron_log_1 = __importDefault(require("electron-log"));
const util_1 = require("@ethereumjs/util");
const provider_1 = __importDefault(require("../provider"));
const accounts_1 = __importDefault(require("../accounts"));
const store_1 = __importDefault(require("../store"));
const origins_1 = require("./origins");
const validPayload_1 = __importDefault(require("./validPayload"));
const protectedMethods_1 = __importDefault(require("./protectedMethods"));
const logTraffic = process.env.LOG_TRAFFIC;
const polls = {};
const pollSubs = {};
const pending = {};
const cleanupTimers = {};
const connectionMonitors = {};
function extendSession(originId) {
    if (originId) {
        clearTimeout(connectionMonitors[originId]);
        connectionMonitors[originId] = setTimeout(() => {
            store_1.default.endOriginSession(originId);
        }, 60 * 1000);
    }
}
const cleanup = (id) => {
    delete polls[id];
    delete pending[id];
    Object.keys(pollSubs).forEach((sub) => {
        if (pollSubs[sub].id === id) {
            provider_1.default.send({ jsonrpc: '2.0', id: 1, method: 'eth_unsubscribe', params: [sub], _origin: '' });
            delete pollSubs[sub];
        }
    });
};
const handler = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
    }
    else if (req.method === 'POST') {
        const body = [];
        req
            .on('data', (chunk) => body.push(chunk))
            .on('end', async () => {
            res.on('error', (err) => console.error('res err', err));
            const data = Buffer.concat(body).toString();
            const rawPayload = (0, validPayload_1.default)(data);
            if (!rawPayload)
                return console.warn('Invalid Payload', data);
            if (logTraffic)
                electron_log_1.default.info(`req -> | http | ${req.headers.origin} | ${rawPayload.method} | -> | ${JSON.stringify(rawPayload.params)}`);
            const origin = (0, origins_1.parseOrigin)(req.headers.origin);
            const { payload, chainId } = (0, origins_1.updateOrigin)(rawPayload, origin);
            extendSession(payload._origin);
            if (!(0, util_1.isHexString)(chainId)) {
                const error = {
                    message: `Invalid chain id (${rawPayload.chainId}), chain id must be hex-prefixed string`,
                    code: -1
                };
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ id: payload.id, jsonrpc: payload.jsonrpc, error }));
            }
            if (protectedMethods_1.default.indexOf(payload.method) > -1 && !(await (0, origins_1.isTrusted)(payload))) {
                let error = { message: `Permission denied, approve ${origin} in EvoTradeWallet to continue`, code: 4001 };
                // Review
                if (!accounts_1.default.getSelectedAddresses()[0])
                    error = { message: 'No EvoTradeWallet account selected', code: 4001 };
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ id: payload.id, jsonrpc: payload.jsonrpc, error }));
            }
            else {
                if (payload.method === 'eth_pollSubscriptions') {
                    const id = payload.params[0];
                    const send = (force) => {
                        const result = polls[id] || [];
                        if (result.length || payload.params[1] === 'immediate' || force) {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            const response = { id: payload.id, jsonrpc: payload.jsonrpc, result };
                            if (logTraffic)
                                electron_log_1.default.info(`<- res | http | ${origin} | ${payload.method} | <- | ${JSON.stringify(response)}`);
                            res.end(JSON.stringify(response));
                            delete polls[id];
                            clearTimeout(cleanupTimers[id]);
                            cleanupTimers[id] = setTimeout(cleanup.bind(null, id), 20 * 1000);
                        }
                        else {
                            const sendResponse = () => {
                                const pendingRequest = pending[id];
                                if (pendingRequest && pendingRequest.timer) {
                                    clearTimeout(pendingRequest.timer);
                                }
                                delete pending[id];
                                send(true);
                            };
                            pending[id] = {
                                send: sendResponse,
                                timer: setTimeout(sendResponse, 15 * 1000)
                            };
                        }
                    };
                    if (typeof id === 'string')
                        return send(false);
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid Client ID' }));
                }
                provider_1.default.send(payload, (response) => {
                    if (response && response.result) {
                        if (payload.method === 'eth_subscribe') {
                            pollSubs[response.result] = { id: rawPayload.pollId || '', origin: payload._origin }; // Refactor this so you don't need to send a pollId and use the existing subscription id
                        }
                        else if (payload.method === 'eth_unsubscribe') {
                            payload.params.forEach((sub) => {
                                if (pollSubs[sub])
                                    delete pollSubs[sub];
                            });
                        }
                    }
                    if (logTraffic)
                        electron_log_1.default.info(`<- res | http | ${req.headers.origin} | ${payload.method} | <- | ${JSON.stringify(response)}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(response));
                });
            }
        })
            .on('error', (err) => console.error('req err', err));
    }
    else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Permission Denied' }));
    }
};
provider_1.default.on('data:subscription', (payload) => {
    const subscription = pollSubs[payload.params.subscription];
    if (subscription) {
        const { id } = subscription;
        polls[id] = polls[id] || [];
        polls[id].push(JSON.stringify(payload));
        pending[id]?.send();
    }
});
function default_1() {
    return http_1.default.createServer(handler);
}
exports.default = default_1;
