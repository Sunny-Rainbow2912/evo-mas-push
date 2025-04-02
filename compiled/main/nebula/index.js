"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// store electron version
const electron = process.versions.electron;
// Delete the electron version while requiring Nebula. This allows ipfs-utils to use
// node-fetch instead of electron-fetch - can remove this when ipfs-utils supports ELECTRON_RUN_AS_NODE
// https://github.com/ipfs/js-ipfs-utils/issues/140
const versions = process.versions;
delete versions.electron;
const nebula_1 = __importDefault(require("nebula"));
// reinstate original electron version
versions.electron = electron;
const ethereum_provider_1 = __importDefault(require("ethereum-provider"));
const proxy_1 = __importDefault(require("../provider/proxy"));
const stream_1 = require("stream");
const authToken = process.env.NEBULA_AUTH_TOKEN ? process.env.NEBULA_AUTH_TOKEN + '@' : '';
const pylonUrl = `https://${authToken}@ipfs.nebula.land`;
// all ENS interaction happens on mainnet
const mainnetProvider = new ethereum_provider_1.default(proxy_1.default);
mainnetProvider.setChain(1);
const isMainnetConnected = (chains) => !!chains.find((chain) => chain.chainId === 1)?.connected;
function default_1(provider = mainnetProvider) {
    let ready = false;
    const events = new stream_1.EventEmitter();
    const readyHandler = (chains) => {
        if (isMainnetConnected(chains)) {
            provider.off('chainsChanged', readyHandler);
            ready = true;
            events.emit('ready');
        }
    };
    provider.on('chainsChanged', readyHandler);
    provider.once('connect', async () => {
        const activeChains = await provider.request({
            method: 'wallet_getEthereumChains'
        });
        readyHandler(activeChains);
    });
    return {
        once: events.once.bind(events),
        ready: () => ready,
        ...(0, nebula_1.default)(pylonUrl, provider)
    };
}
exports.default = default_1;
