"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const uuid_1 = require("uuid");
const electron_log_1 = __importDefault(require("electron-log"));
const util_1 = require("@ethereumjs/util");
const store_1 = __importDefault(require("../store"));
const provider_1 = __importDefault(require("../provider"));
const accounts_1 = __importDefault(require("../accounts"));
const windows_1 = __importDefault(require("../windows"));
const origins_1 = require("./origins");
const validPayload_1 = __importDefault(require("./validPayload"));
const protectedMethods_1 = __importDefault(require("./protectedMethods"));
const logTraffic = (origin) => process.env.LOG_TRAFFIC === 'true' || process.env.LOG_TRAFFIC === origin;
const subs = {};
const connectionMonitors = {};
function extendSession(originId) {
    if (originId) {
        clearTimeout(connectionMonitors[originId]);
        connectionMonitors[originId] = setTimeout(() => {
            store_1.default.endOriginSession(originId);
        }, 60 * 1000);
    }
}
const handler = (socket, req) => {
    socket.id = (0, uuid_1.v4)();
    socket.origin = req.headers.origin;
    socket.frameExtension = (0, origins_1.parseFrameExtension)(req);
    const res = (payload) => {
        if (socket.readyState === ws_1.default.OPEN) {
            socket.send(JSON.stringify(payload), (err) => {
                if (err)
                    electron_log_1.default.info(err);
            });
        }
    };
    socket.on('message', async (data) => {
        const rawPayload = (0, validPayload_1.default)(data.toString());
        if (!rawPayload)
            return console.warn('Invalid Payload', data);
        let requestOrigin = socket.origin;
        if (socket.frameExtension) {
            if (!(await (0, origins_1.isKnownExtension)(socket.frameExtension))) {
                const error = {
                    message: `Permission denied, approve connection from EvoTrade Companion with id ${socket.frameExtension.id} in Frame to continue`,
                    code: 4001
                };
                return res({ id: rawPayload.id, jsonrpc: rawPayload.jsonrpc, error });
            }
            // Request from extension, swap origin
            if (rawPayload.__frameOrigin) {
                requestOrigin = rawPayload.__frameOrigin;
                delete rawPayload.__frameOrigin;
            }
            else {
                requestOrigin = 'frame-extension';
            }
        }
        const origin = (0, origins_1.parseOrigin)(requestOrigin);
        if (logTraffic(origin))
            electron_log_1.default.info(`req -> | ${socket.frameExtension ? 'ext' : 'ws'} | ${origin} | ${rawPayload.method} | -> | ${rawPayload.params}`);
        const { payload, chainId } = (0, origins_1.updateOrigin)(rawPayload, origin, rawPayload.__extensionConnecting);
        if (!(0, util_1.isHexString)(chainId)) {
            const error = {
                message: `Invalid chain id (${rawPayload.chainId}), chain id must be hex-prefixed string`,
                code: -1
            };
            return res({ id: rawPayload.id, jsonrpc: rawPayload.jsonrpc, error });
        }
        if (!rawPayload.__extensionConnecting) {
            extendSession(payload._origin);
        }
        if (origin === 'frame-extension') {
            // custom extension action for summoning Frame
            if (rawPayload.method === 'frame_summon')
                return windows_1.default.toggleTray();
            const { id, jsonrpc } = rawPayload;
            if (rawPayload.method === 'eth_chainId')
                return res({ id, jsonrpc, result: chainId });
            if (rawPayload.method === 'net_version')
                return res({ id, jsonrpc, result: parseInt(chainId, 16) });
        }
        if (protectedMethods_1.default.indexOf(payload.method) > -1 && !(await (0, origins_1.isTrusted)(payload))) {
            let error = { message: 'Permission denied, approve ' + origin + ' in EvoTradeWallet to continue', code: 4001 };
            // review
            if (!accounts_1.default.getSelectedAddresses()[0])
                error = { message: 'No EvoTradeWallet account selected', code: 4001 };
            res({ id: payload.id, jsonrpc: payload.jsonrpc, error });
        }
        else {
            provider_1.default.send(payload, (response) => {
                if (response && response.result) {
                    if (payload.method === 'eth_subscribe') {
                        subs[response.result] = { socket, originId: payload._origin };
                    }
                    else if (payload.method === 'eth_unsubscribe') {
                        payload.params.forEach((sub) => {
                            if (subs[sub])
                                delete subs[sub];
                        });
                    }
                }
                if (logTraffic(origin))
                    electron_log_1.default.info(`<- res | ${socket.frameExtension ? 'ext' : 'ws'} | ${origin} | ${payload.method} | <- | ${JSON.stringify(response.result || response.error)}`);
                res(response);
            });
        }
    });
    socket.on('error', (err) => electron_log_1.default.error(err));
    socket.on('close', () => {
        Object.keys(subs).forEach((sub) => {
            if (subs[sub].socket.id === socket.id) {
                provider_1.default.send({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'eth_unsubscribe',
                    _origin: subs[sub].originId,
                    params: [sub]
                });
                delete subs[sub];
            }
        });
    });
};
function default_1(server) {
    const ws = new ws_1.default.Server({ server });
    ws.on('connection', handler);
    provider_1.default.on('data:subscription', (payload) => {
        const subscription = subs[payload.params.subscription];
        if (subscription) {
            subscription.socket.send(JSON.stringify(payload));
        }
    });
    return server;
}
exports.default = default_1;
