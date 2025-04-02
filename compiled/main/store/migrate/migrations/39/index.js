"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_log_1 = __importDefault(require("electron-log"));
const schema_1 = require("../38/schema");
function removePoaConnection(connection) {
    // remove Gnosis chain preset
    const isPoa = connection.current === 'poa';
    if (isPoa) {
        electron_log_1.default.info('Migration 39: removing POA presets from Gnosis chain');
    }
    return {
        ...connection,
        current: isPoa ? 'custom' : connection.current,
        custom: isPoa ? 'https://rpc.gnosischain.com' : connection.custom
    };
}
const migrate = (initial) => {
    try {
        const state = schema_1.v38StateSchema.parse(initial);
        const gnosisChainPresent = '100' in state.main.networks.ethereum;
        if (gnosisChainPresent) {
            const gnosisChain = state.main.networks.ethereum[100];
            state.main.networks.ethereum[100] = {
                ...gnosisChain,
                connection: {
                    primary: removePoaConnection(gnosisChain.connection.primary),
                    secondary: removePoaConnection(gnosisChain.connection.secondary)
                }
            };
        }
        return state;
    }
    catch (e) {
        electron_log_1.default.error('Migration 39: could not parse state', e);
    }
    return initial;
};
exports.default = {
    version: 39,
    migrate
};
