"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_log_1 = __importDefault(require("electron-log"));
const schema_1 = require("../38/schema");
function baseMainnet() {
    const chain = {
        id: 8453,
        type: 'ethereum',
        layer: 'rollup',
        isTestnet: false,
        name: 'Base',
        explorer: 'https://basescan.org',
        gas: {
            price: {
                selected: 'standard',
                levels: { slow: '', standard: '', fast: '', asap: '', custom: '' }
            }
        },
        connection: {
            primary: {
                on: true,
                current: 'pylon',
                status: 'loading',
                connected: false,
                type: '',
                network: '',
                custom: ''
            },
            secondary: {
                on: false,
                current: 'custom',
                status: 'loading',
                connected: false,
                type: '',
                network: '',
                custom: ''
            }
        },
        on: false
    };
    const metadata = {
        blockHeight: 0,
        gas: {
            fees: {},
            price: {
                selected: 'standard',
                levels: { slow: '', standard: '', fast: '', asap: '', custom: '' }
            }
        },
        nativeCurrency: {
            symbol: 'ETH',
            usd: {
                price: 0,
                change24hr: 0
            },
            icon: '',
            name: 'Ether',
            decimals: 18
        },
        icon: 'https://frame.nyc3.cdn.digitaloceanspaces.com/baseiconcolor.png',
        primaryColor: 'accent8' // Base
    };
    return { chain, metadata };
}
const migrate = (initial) => {
    try {
        const state = schema_1.v38StateSchema.parse(initial);
        const usingBase = '8453' in state.main.networks.ethereum;
        if (!usingBase) {
            const { chain, metadata } = baseMainnet();
            state.main.networks.ethereum[8453] = chain;
            state.main.networksMeta.ethereum[8453] = metadata;
        }
        return state;
    }
    catch (e) {
        electron_log_1.default.error('Migration 40: could not parse state', e);
    }
    return initial;
};
exports.default = {
    version: 40,
    migrate
};
