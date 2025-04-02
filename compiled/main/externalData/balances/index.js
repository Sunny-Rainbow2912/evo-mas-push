"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_log_1 = __importDefault(require("electron-log"));
const constants_1 = require("../../../resources/constants");
const balance_1 = require("../../../resources/domain/balance");
const controller_1 = __importDefault(require("./controller"));
const RESTART_WAIT = 5; // seconds
// time to wait in between scans, in seconds
const scanInterval = {
    active: 20,
    inactive: 60 * 10
};
function default_1(store) {
    const storeApi = {
        getActiveAddress: () => (store('selected.current') || ''),
        getNetwork: (id) => (store('main.networks.ethereum', id) || {}),
        getNativeCurrencySymbol: (id) => store('main.networksMeta.ethereum', id, 'nativeCurrency', 'symbol'),
        getConnectedNetworks: () => {
            const networks = Object.values(store('main.networks.ethereum') || {});
            return networks.filter((n) => (n.connection.primary || {}).connected || (n.connection.secondary || {}).connected);
        },
        getCustomTokens: () => (store('main.tokens.custom') || []),
        getKnownTokens: (address) => (address && store('main.tokens.known', address)) || [],
        getCurrencyBalances: (address) => {
            return (store('main.balances', address) || []).filter((balance) => balance.address === constants_1.NATIVE_CURRENCY);
        },
        getTokenBalances: (address) => {
            return (store('main.balances', address) || []).filter((balance) => balance.address !== constants_1.NATIVE_CURRENCY);
        }
    };
    let scan;
    let workerController;
    let onResume;
    function attemptRestart() {
        electron_log_1.default.warn(`balances controller stopped, restarting in ${RESTART_WAIT} seconds`);
        stop();
        setTimeout(restart, RESTART_WAIT * 1000);
    }
    function handleClose() {
        workerController = null;
        attemptRestart();
    }
    function runWhenReady(fn) {
        if (workerController?.isRunning()) {
            // worker is running, start the scan
            fn();
        }
        else {
            electron_log_1.default.verbose('worker controller not running yet, waiting for ready event');
            // wait for worker to be ready
            workerController?.once('ready', () => {
                fn();
            });
        }
    }
    function start() {
        electron_log_1.default.verbose('starting balances updates');
        workerController = new controller_1.default();
        workerController.once('close', handleClose);
        workerController.on('chainBalances', (address, balances) => {
            handleUpdate(address, handleChainBalanceUpdate.bind(null, balances));
        });
        workerController.on('tokenBalances', (address, balances) => {
            handleUpdate(address, handleTokenBalanceUpdate.bind(null, balances));
        });
        workerController.on('tokenBlacklist', (address, tokens) => {
            handleUpdate(address, handleTokenBlacklistUpdate.bind(null, tokens));
        });
    }
    function restart() {
        start();
        setAddress(storeApi.getActiveAddress());
    }
    function resume() {
        if (onResume)
            onResume();
        onResume = null;
    }
    function pause() {
        if (stopScan()) {
            electron_log_1.default.debug('Pausing balances scan');
            const address = storeApi.getActiveAddress();
            if (address) {
                // even when paused ensure data is updated every 10 minutes
                resetScan(address, scanInterval.inactive);
                onResume = () => {
                    electron_log_1.default.verbose(`Resuming balances scan for address ${address}`);
                    startScan(address);
                };
            }
        }
    }
    function stop() {
        electron_log_1.default.verbose('stopping balances updates');
        stopScan();
        if (workerController) {
            // if controller is explicitly stopped, don't attempt to restart
            workerController.off('close', handleClose);
            workerController.close();
            workerController = null;
        }
    }
    function startScan(address) {
        stopScan();
        if (onResume)
            onResume = null;
        electron_log_1.default.verbose(`Starting balances scan for ${address}`);
        const initiateScan = () => {
            // do an initial scan before starting the timer
            setTimeout(() => {
                updateActiveBalances(address);
            }, 0);
            resetScan(address, scanInterval.active);
        };
        runWhenReady(() => initiateScan());
    }
    function stopScan() {
        if (scan) {
            clearTimeout(scan);
            scan = null;
            return true;
        }
        return false;
    }
    function resetScan(address, interval) {
        scan = setTimeout(() => {
            if (workerController?.isRunning()) {
                setTimeout(() => {
                    updateActiveBalances(address);
                }, 0);
            }
            resetScan(address, interval);
        }, interval * 1000);
    }
    function updateActiveBalances(address) {
        const activeNetworkIds = storeApi.getConnectedNetworks().map((network) => network.id);
        updateBalances(address, activeNetworkIds);
    }
    function updateBalances(address, chains) {
        const customTokens = storeApi.getCustomTokens();
        const knownTokens = storeApi
            .getKnownTokens(address)
            .filter((token) => !customTokens.some((t) => t.address === token.address && t.chainId === token.chainId));
        const trackedTokens = [...customTokens, ...knownTokens].filter((t) => chains.includes(t.chainId));
        if (trackedTokens.length > 0) {
            workerController?.updateKnownTokenBalances(address, trackedTokens);
        }
        workerController?.updateChainBalances(address, chains);
        workerController?.scanForTokenBalances(address, trackedTokens, chains);
    }
    function handleUpdate(address, updateFn) {
        // because updates come from another process its possible to receive updates after an account
        // has been removed but before we stop the scan, so check to make sure the account exists
        if (store('main.accounts', address)) {
            updateFn(address);
        }
    }
    function handleChainBalanceUpdate(balances, address) {
        const currentChainBalances = storeApi.getCurrencyBalances(address);
        // only update balances that have changed
        balances
            .filter((balance) => (currentChainBalances.find((b) => b.chainId === balance.chainId) || {}).balance !== balance.balance)
            .forEach((balance) => {
            store.setBalance(address, {
                ...balance,
                symbol: storeApi.getNativeCurrencySymbol(balance.chainId),
                address: constants_1.NATIVE_CURRENCY
            });
        });
    }
    function handleTokenBalanceUpdate(balances, address) {
        // only update balances if any have changed
        const currentTokenBalances = storeApi.getTokenBalances(address);
        const customTokens = new Set(storeApi.getCustomTokens().map(balance_1.toTokenId));
        const isCustomToken = (balance) => customTokens.has((0, balance_1.toTokenId)(balance));
        const changedBalances = balances.filter((newBalance) => {
            const currentBalance = currentTokenBalances.find((b) => b.address === newBalance.address && b.chainId === newBalance.chainId);
            // do not add newly found tokens with a zero balance
            const isNewBalance = !currentBalance && parseInt(newBalance.balance) !== 0;
            const isChangedBalance = !!currentBalance && currentBalance.balance !== newBalance.balance;
            return isNewBalance || isChangedBalance || isCustomToken(newBalance);
        });
        if (changedBalances.length > 0) {
            store.setBalances(address, changedBalances);
            const knownTokens = new Set(storeApi.getKnownTokens(address).map(balance_1.toTokenId));
            const isKnown = (balance) => knownTokens.has((0, balance_1.toTokenId)(balance));
            // add any non-zero balances to the list of known tokens
            const unknownBalances = changedBalances.filter((b) => parseInt(b.balance) > 0 && !isKnown(b));
            if (unknownBalances.length > 0) {
                store.addKnownTokens(address, unknownBalances);
            }
            // remove zero balances from the list of known tokens
            const zeroBalances = changedBalances.reduce((zeroBalSet, balance) => {
                const tokenId = (0, balance_1.toTokenId)(balance);
                if (parseInt(balance.balance) === 0 && knownTokens.has(tokenId)) {
                    zeroBalSet.add(tokenId);
                }
                return zeroBalSet;
            }, new Set());
            if (zeroBalances.size) {
                store.removeKnownTokens(address, zeroBalances);
            }
        }
        store.accountTokensUpdated(address);
    }
    function handleTokenBlacklistUpdate(tokensToRemove) {
        const includesBlacklistedTokens = (arr) => arr.some((val) => tokensToRemove.has((0, balance_1.toTokenId)(val)));
        const balances = store('main.balances');
        const knownTokens = store('main.tokens.known');
        Object.entries(balances).forEach(([accountAddress, balances]) => {
            if (includesBlacklistedTokens(balances)) {
                store.removeBalances(accountAddress, tokensToRemove);
            }
        });
        Object.entries(knownTokens).forEach(([accountAddress, tokens]) => {
            if (includesBlacklistedTokens(tokens)) {
                store.removeKnownTokens(accountAddress, tokensToRemove);
            }
        });
    }
    function setAddress(address) {
        if (!workerController) {
            electron_log_1.default.warn(`tried to set address to ${address} but balances controller is not running`);
            return;
        }
        if (address) {
            electron_log_1.default.verbose('setting address for balances updates', address);
            startScan(address);
        }
        else {
            electron_log_1.default.verbose('clearing address for balances updates');
            stopScan();
        }
    }
    function addNetworks(address, chains) {
        if (!workerController) {
            electron_log_1.default.warn('tried to add networks but balances controller is not running');
            return;
        }
        electron_log_1.default.verbose('adding balances updates', { address, chains });
        runWhenReady(() => updateBalances(address, chains));
    }
    function addTokens(address, tokens) {
        if (!workerController) {
            electron_log_1.default.warn('tried to add tokens but balances controller is not running');
            return;
        }
        electron_log_1.default.verbose('adding balances updates', { address, tokens: tokens.map((t) => t.address) });
        runWhenReady(() => workerController?.updateKnownTokenBalances(address, tokens));
    }
    return { start, stop, resume, pause, setAddress, addNetworks, addTokens };
}
exports.default = default_1;
