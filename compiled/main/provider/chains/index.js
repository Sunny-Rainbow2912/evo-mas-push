"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOriginChainObserver = exports.createChainsObserver = exports.getActiveChains = void 0;
const deep_equal_1 = __importDefault(require("deep-equal"));
const colors_1 = require("../../../resources/colors");
const store_1 = __importDefault(require("../../store"));
// typed access to state
const storeApi = {
    getCurrentOrigins: () => {
        return (0, store_1.default)('main.origins');
    },
    getChains: () => {
        return (0, store_1.default)('main.networks.ethereum') || {};
    },
    getChainsMeta: () => {
        return (0, store_1.default)('main.networksMeta.ethereum') || {};
    },
    getColorway: () => {
        return (0, store_1.default)('main.colorway');
    }
};
function createChainsObserver(handler) {
    let availableChains = getActiveChains();
    return function () {
        const currentChains = getActiveChains();
        if (!(0, deep_equal_1.default)(currentChains, availableChains)) {
            availableChains = currentChains;
            setTimeout(() => {
                const currentAccount = (0, store_1.default)('selected.current');
                handler.chainsChanged(currentAccount, availableChains);
            }, 0);
        }
    };
}
exports.createChainsObserver = createChainsObserver;
function createOriginChainObserver(handler) {
    let knownOrigins = {};
    return function () {
        const currentOrigins = storeApi.getCurrentOrigins();
        for (const originId in currentOrigins) {
            const currentOrigin = currentOrigins[originId];
            const knownOrigin = knownOrigins[originId];
            if (knownOrigin && knownOrigin.chain.id !== currentOrigin.chain.id) {
                handler.chainChanged(currentOrigin.chain.id, originId);
                handler.networkChanged(currentOrigin.chain.id, originId);
            }
            knownOrigins[originId] = currentOrigin;
        }
    };
}
exports.createOriginChainObserver = createOriginChainObserver;
function getActiveChains() {
    const chains = storeApi.getChains();
    const meta = storeApi.getChainsMeta();
    const colorway = storeApi.getColorway();
    return Object.values(chains)
        .filter((chain) => chain.on)
        .sort((a, b) => a.id - b.id)
        .map((chain) => {
        const { id, explorer, name } = chain;
        const { nativeCurrency, primaryColor } = meta[id];
        const { icon: currencyIcon, name: currencyName, symbol, decimals } = nativeCurrency;
        const icons = currencyIcon ? [{ url: currencyIcon }] : [];
        const colors = primaryColor ? [(0, colors_1.getColor)(primaryColor, colorway)] : [];
        return {
            chainId: id,
            networkId: id,
            name,
            connected: chain.connection.primary.connected || chain.connection.secondary.connected,
            nativeCurrency: {
                name: currencyName,
                symbol,
                decimals
            },
            icon: icons,
            explorers: [{ url: explorer }],
            external: {
                wallet: { colors }
            }
        };
    });
}
exports.getActiveChains = getActiveChains;
