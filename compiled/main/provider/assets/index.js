"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createObserver = exports.loadAssets = void 0;
const store_1 = __importDefault(require("../../store"));
const constants_1 = require("../../../resources/constants");
// typed access to state
const storeApi = {
    getBalances: (account) => {
        return (0, store_1.default)('main.balances', account) || [];
    },
    getNativeCurrency: (chainId) => {
        const currency = (0, store_1.default)('main.networksMeta.ethereum', chainId, 'nativeCurrency');
        return currency || { usd: { price: 0 } };
    },
    getUsdRate: (address) => {
        const rate = (0, store_1.default)('main.rates', address.toLowerCase());
        return rate || { usd: { price: 0 } };
    },
    getLastUpdated: (account) => {
        return (0, store_1.default)('main.accounts', account, 'balances.lastUpdated');
    }
};
function createObserver(handler) {
    let debouncedAssets = null;
    return function () {
        const currentAccountId = (0, store_1.default)('selected.current');
        if (currentAccountId) {
            const assets = fetchAssets(currentAccountId);
            if (!isScanning(currentAccountId) && (assets.erc20.length > 0 || assets.nativeCurrency.length > 0)) {
                if (!debouncedAssets) {
                    setTimeout(() => {
                        if (debouncedAssets) {
                            handler.assetsChanged(currentAccountId, debouncedAssets);
                            debouncedAssets = null;
                        }
                    }, 800);
                }
                debouncedAssets = assets;
            }
        }
    };
}
exports.createObserver = createObserver;
function loadAssets(accountId) {
    if (isScanning(accountId))
        throw new Error('assets not known for account');
    return fetchAssets(accountId);
}
exports.loadAssets = loadAssets;
function fetchAssets(accountId) {
    const balances = storeApi.getBalances(accountId);
    const response = {
        nativeCurrency: [],
        erc20: []
    };
    return balances.reduce((assets, balance) => {
        if (balance.address === constants_1.NATIVE_CURRENCY) {
            const currency = storeApi.getNativeCurrency(balance.chainId);
            assets.nativeCurrency.push({
                ...balance,
                currencyInfo: currency
            });
        }
        else {
            const usdRate = storeApi.getUsdRate(balance.address);
            assets.erc20.push({
                ...balance,
                tokenInfo: {
                    lastKnownPrice: usdRate
                }
            });
        }
        return assets;
    }, response);
}
function isScanning(account) {
    const lastUpdated = storeApi.getLastUpdated(account);
    return !lastUpdated || new Date().getTime() - lastUpdated > 1000 * 60 * 5;
}
