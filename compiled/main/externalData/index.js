"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_log_1 = __importDefault(require("electron-log"));
const pylon_client_1 = __importDefault(require("@framelabs/pylon-client"));
const store_1 = __importDefault(require("../store"));
const inventory_1 = __importDefault(require("./inventory"));
const assets_1 = __importDefault(require("./assets"));
const balances_1 = __importDefault(require("./balances"));
const utils_1 = require("../../resources/utils");
const storeApi = {
    getActiveAddress: () => ((0, store_1.default)('selected.current') || ''),
    getCustomTokens: () => ((0, store_1.default)('main.tokens.custom') || []),
    getKnownTokens: (address) => ((address && (0, store_1.default)('main.tokens.known', address)) || []),
    getConnectedNetworks: () => {
        const networks = Object.values((0, store_1.default)('main.networks.ethereum') || {});
        return networks.filter((n) => (n.connection.primary || {}).connected || (n.connection.secondary || {}).connected);
    }
};
function default_1() {
    const pylon = new pylon_client_1.default('wss://data.pylon.link');
    const inventory = (0, inventory_1.default)(pylon, store_1.default);
    const rates = (0, assets_1.default)(pylon, store_1.default);
    const balances = (0, balances_1.default)(store_1.default);
    let connectedChains = [], activeAccount = '';
    let pauseScanningDelay;
    inventory.start();
    rates.start();
    balances.start();
    const handleNetworkUpdate = (0, utils_1.debounce)((newlyConnected) => {
        electron_log_1.default.verbose('updating external data due to network update(s)', { connectedChains, newlyConnected });
        rates.updateSubscription(connectedChains, activeAccount);
        if (newlyConnected.length > 0 && activeAccount) {
            balances.addNetworks(activeAccount, newlyConnected);
        }
    }, 500);
    const handleAddressUpdate = (0, utils_1.debounce)(() => {
        electron_log_1.default.verbose('updating external data due to address update(s)', { activeAccount });
        balances.setAddress(activeAccount);
        inventory.setAddresses([activeAccount]);
        rates.updateSubscription(connectedChains, activeAccount);
    }, 800);
    const handleTokensUpdate = (0, utils_1.debounce)((tokens) => {
        electron_log_1.default.verbose('updating external data due to token update(s)', { activeAccount });
        if (activeAccount) {
            balances.addTokens(activeAccount, tokens);
        }
        rates.updateSubscription(connectedChains, activeAccount);
    });
    const allNetworksObserver = store_1.default.observer(() => {
        const connectedNetworkIds = storeApi
            .getConnectedNetworks()
            .map((n) => n.id)
            .sort();
        if (!(0, utils_1.arraysMatch)(connectedChains, connectedNetworkIds)) {
            const newlyConnectedNetworks = connectedNetworkIds.filter((c) => !connectedChains.includes(c));
            connectedChains = connectedNetworkIds;
            handleNetworkUpdate(newlyConnectedNetworks);
        }
    }, 'externalData:networks');
    const activeAddressObserver = store_1.default.observer(() => {
        const activeAddress = storeApi.getActiveAddress();
        const knownTokens = storeApi.getKnownTokens(activeAddress);
        if (activeAddress !== activeAccount) {
            activeAccount = activeAddress;
            handleAddressUpdate();
        }
        else {
            handleTokensUpdate(knownTokens);
        }
    }, 'externalData:activeAccount');
    const customTokensObserver = store_1.default.observer(() => {
        const customTokens = storeApi.getCustomTokens();
        handleTokensUpdate(customTokens);
    }, 'externalData:customTokens');
    const trayObserver = store_1.default.observer(() => {
        const open = (0, store_1.default)('tray.open');
        if (!open) {
            // pause balance scanning after the tray is out of view for one minute
            if (!pauseScanningDelay) {
                pauseScanningDelay = setTimeout(balances.pause, 1000);
            }
        }
        else {
            if (pauseScanningDelay) {
                clearTimeout(pauseScanningDelay);
                pauseScanningDelay = undefined;
                balances.resume();
            }
        }
    }, 'externalData:tray');
    return {
        close: () => {
            allNetworksObserver.remove();
            activeAddressObserver.remove();
            customTokensObserver.remove();
            trayObserver.remove();
            inventory.stop();
            rates.stop();
            balances.stop();
            if (pauseScanningDelay) {
                clearTimeout(pauseScanningDelay);
            }
        }
    };
}
exports.default = default_1;
