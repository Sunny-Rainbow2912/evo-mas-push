"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_log_1 = __importDefault(require("electron-log"));
const pylon_client_1 = require("@framelabs/pylon-client");
function rates(pylon, store) {
    const storeApi = {
        getKnownTokens: (address) => ((address && store('main.tokens.known', address)) || []),
        getCustomTokens: () => (store('main.tokens.custom') || []),
        setNativeCurrencyData: (chainId, currencyData) => store.setNativeCurrencyData('ethereum', chainId, currencyData),
        setNativeCurrencyRate: (chainId, rate) => store.setNativeCurrencyData('ethereum', chainId, { usd: rate }),
        setTokenRates: (rates) => store.setRates(rates)
    };
    function handleRatesUpdates(updates) {
        if (updates.length === 0)
            return;
        const nativeCurrencyUpdates = updates.filter((u) => u.id.type === pylon_client_1.AssetType.NativeCurrency);
        if (nativeCurrencyUpdates.length > 0) {
            electron_log_1.default.debug(`got currency rate updates for chains: ${nativeCurrencyUpdates.map((u) => u.id.chainId)}`);
            nativeCurrencyUpdates.forEach((u) => {
                storeApi.setNativeCurrencyRate(u.id.chainId, {
                    price: u.data.usd,
                    change24hr: u.data.usd_24h_change
                });
            });
        }
        const tokenUpdates = updates.filter((u) => u.id.type === pylon_client_1.AssetType.Token);
        if (tokenUpdates.length > 0) {
            electron_log_1.default.debug(`got token rate updates for addresses: ${tokenUpdates.map((u) => u.id.address)}`);
            const tokenRates = tokenUpdates.reduce((allRates, update) => {
                // address is always defined for tokens
                const address = update.id.address;
                allRates[address] = {
                    usd: {
                        price: update.data.usd,
                        change24hr: update.data.usd_24h_change
                    }
                };
                return allRates;
            }, {});
            storeApi.setTokenRates(tokenRates);
        }
    }
    function updateSubscription(chains, address) {
        const subscribedCurrencies = chains.map((chainId) => ({ type: pylon_client_1.AssetType.NativeCurrency, chainId }));
        const knownTokens = storeApi.getKnownTokens(address).filter((token) => chains.includes(token.chainId));
        const customTokens = storeApi
            .getCustomTokens()
            .filter((token) => !knownTokens.some((kt) => kt.address === token.address && kt.chainId === token.chainId));
        const subscribedTokens = [...knownTokens, ...customTokens].map((token) => ({
            type: pylon_client_1.AssetType.Token,
            chainId: token.chainId,
            address: token.address
        }));
        setAssets([...subscribedCurrencies, ...subscribedTokens]);
    }
    function start() {
        electron_log_1.default.verbose('starting asset updates');
        pylon.on('rates', handleRatesUpdates);
    }
    function stop() {
        electron_log_1.default.verbose('stopping asset updates');
        pylon.off('rates', handleRatesUpdates);
        pylon.rates([]);
    }
    function setAssets(assetIds) {
        electron_log_1.default.verbose('subscribing to rates updates for native currencies on chains:', assetIds.filter((a) => a.type === pylon_client_1.AssetType.NativeCurrency).map((a) => a.chainId));
        electron_log_1.default.verbose('subscribing to rates updates for tokens:', assetIds.filter((a) => a.type === pylon_client_1.AssetType.Token).map((a) => a.address));
        pylon.rates(assetIds);
    }
    return {
        start,
        stop,
        setAssets,
        updateSubscription
    };
}
exports.default = rates;
