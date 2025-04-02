"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const electron_log_1 = __importDefault(require("electron-log"));
const url_1 = __importDefault(require("url"));
// DO NOT MOVE - env var below is required for app init and must be set before all local imports
process.env.BUNDLE_LOCATION = process.env.BUNDLE_LOCATION || path_1.default.resolve(__dirname, './../..', 'bundle');
const errors = __importStar(require("./errors"));
const windows_1 = __importDefault(require("./windows"));
const menu_1 = __importDefault(require("./menu"));
const store_1 = __importDefault(require("./store"));
const dapps_1 = __importDefault(require("./dapps"));
const accounts_1 = __importDefault(require("./accounts"));
const launch = __importStar(require("./launch"));
const updater_1 = __importDefault(require("./updater"));
const signers_1 = __importDefault(require("./signers"));
const persist_1 = __importDefault(require("./store/persist"));
const dialog_1 = require("./windows/dialog");
const window_1 = require("./windows/window");
const erc20_1 = __importDefault(require("./contracts/erc20"));
const utils_1 = require("../resources/utils");
electron_1.app.commandLine.appendSwitch('enable-accelerated-2d-canvas', 'true');
electron_1.app.commandLine.appendSwitch('enable-gpu-rasterization', 'true');
electron_1.app.commandLine.appendSwitch('force-gpu-rasterization', 'true');
electron_1.app.commandLine.appendSwitch('ignore-gpu-blacklist', 'true');
electron_1.app.commandLine.appendSwitch('enable-native-gpu-memory-buffers', 'true');
electron_1.app.commandLine.appendSwitch('force-color-profile', 'srgb');
const isDev = process.env.NODE_ENV === 'development';
electron_log_1.default.transports.console.level = process.env.LOG_LEVEL || (isDev ? 'verbose' : 'info');
if (process.env.LOG_LEVEL === 'debug') {
    electron_log_1.default.transports.file.level = 'debug';
    electron_log_1.default.transports.file.resolvePath = () => path_1.default.join(electron_1.app.getPath('userData'), 'logs/debug.log');
}
else {
    electron_log_1.default.transports.file.level = ['development', 'test'].includes(process.env.NODE_ENV) ? false : 'verbose';
}
const hasInstanceLock = electron_1.app.requestSingleInstanceLock();
if (!hasInstanceLock) {
    electron_log_1.default.info('another instance of EvoTradeWallet is running - exiting...');
    electron_1.app.exit(1);
}
require('./rpc');
errors.init();
electron_log_1.default.info(`Chrome: v${process.versions.chrome}`);
electron_log_1.default.info(`Electron: v${process.versions.electron}`);
electron_log_1.default.info(`Node: v${process.versions.node}`);
// prevent showing the exit dialog more than once
let closing = false;
process.on('uncaughtException', (e) => {
    electron_log_1.default.error('Uncaught Exception!', e);
    const errorCode = (0, utils_1.getErrorCode)(e) ?? '';
    if (errorCode === 'EPIPE') {
        electron_log_1.default.error('uncaught EPIPE error', e);
        return;
    }
    if (!closing) {
        closing = true;
        (0, dialog_1.showUnhandledExceptionDialog)(e.message, errorCode);
    }
});
process.on('unhandledRejection', (e) => {
    electron_log_1.default.error('Unhandled Rejection!', e);
});
function startUpdater() {
    electron_1.powerMonitor.on('resume', () => {
        electron_log_1.default.debug('System resuming, starting updater');
        updater_1.default.start();
    });
    electron_1.powerMonitor.on('suspend', () => {
        electron_log_1.default.debug('System suspending, stopping updater');
        updater_1.default.stop();
    });
    updater_1.default.start();
}
global.eval = () => {
    throw new Error(`This app does not support global.eval()`);
}; // eslint-disable-line
electron_1.ipcMain.on('tray:resetAllSettings', () => {
    persist_1.default.clear();
    if (updater_1.default.updateReady) {
        return updater_1.default.quitAndInstall();
    }
    electron_1.app.relaunch();
    electron_1.app.exit(0);
});
electron_1.ipcMain.on('tray:replaceTx', async (e, id, type) => {
    store_1.default.navBack('panel');
    setTimeout(async () => {
        try {
            await accounts_1.default.replaceTx(id, type);
        }
        catch (e) {
            electron_log_1.default.error('tray:replaceTx Error', e);
        }
    }, 1000);
});
electron_1.ipcMain.on('tray:clipboardData', (e, data) => {
    if (data)
        electron_1.clipboard.writeText(data);
});
electron_1.ipcMain.on('tray:installAvailableUpdate', () => {
    store_1.default.updateBadge('');
    updater_1.default.fetchUpdate();
});
electron_1.ipcMain.on('tray:dismissUpdate', (e, version, remind) => {
    if (!remind) {
        store_1.default.dontRemind(version);
    }
    store_1.default.updateBadge('');
    updater_1.default.dismissUpdate();
});
electron_1.ipcMain.on('tray:removeAccount', (e, id) => {
    accounts_1.default.remove(id);
});
electron_1.ipcMain.on('tray:renameAccount', (e, id, name) => {
    accounts_1.default.rename(id, name);
});
electron_1.ipcMain.on('dash:removeSigner', (e, id) => {
    signers_1.default.remove(id);
});
electron_1.ipcMain.on('dash:reloadSigner', (e, id) => {
    signers_1.default.reload(id);
});
electron_1.ipcMain.on('tray:resolveRequest', (e, req, result) => {
    accounts_1.default.resolveRequest(req, result);
});
electron_1.ipcMain.on('tray:rejectRequest', (e, req) => {
    const err = { code: 4001, message: 'User rejected the request' };
    accounts_1.default.rejectRequest(req, err);
});
electron_1.ipcMain.on('tray:clearRequestsByOrigin', (e, account, origin) => {
    accounts_1.default.clearRequestsByOrigin(account, origin);
});
electron_1.ipcMain.on('tray:openExternal', (e, url) => {
    (0, window_1.openExternal)(url);
    store_1.default.setDash({ showing: false });
});
electron_1.ipcMain.on('tray:openExplorer', (e, chain, hash, account) => {
    (0, window_1.openBlockExplorer)(chain, hash, account);
});
electron_1.ipcMain.on('tray:copyTxHash', (e, hash) => {
    if (hash)
        electron_1.clipboard.writeText(hash);
});
electron_1.ipcMain.on('tray:giveAccess', (e, req, access) => {
    accounts_1.default.setAccess(req, access);
});
electron_1.ipcMain.on('tray:addChain', (e, chain) => {
    store_1.default.addNetwork(chain);
});
electron_1.ipcMain.on('tray:switchChain', (e, type, id, req) => {
    if (type && id)
        store_1.default.selectNetwork(type, id);
    accounts_1.default.resolveRequest(req);
});
electron_1.ipcMain.handle('tray:getTokenDetails', async (e, contractAddress, chainId) => {
    try {
        const contract = new erc20_1.default(contractAddress, chainId);
        return await contract.getTokenData();
    }
    catch (e) {
        electron_log_1.default.warn('Could not load token data for contract', { contractAddress, chainId });
        return {};
    }
});
electron_1.ipcMain.on('tray:addToken', (e, token, req) => {
    if (token) {
        electron_log_1.default.info('adding custom token', token);
        store_1.default.addCustomTokens([token]);
    }
    if (req)
        accounts_1.default.resolveRequest(req);
});
electron_1.ipcMain.on('tray:removeToken', (e, token) => {
    if (token) {
        electron_log_1.default.info('removing custom token', token);
        store_1.default.removeBalance(token.chainId, token.address);
        store_1.default.removeCustomTokens([token]);
    }
});
electron_1.ipcMain.on('tray:adjustNonce', (e, handlerId, nonceAdjust) => {
    accounts_1.default.adjustNonce(handlerId, nonceAdjust);
});
electron_1.ipcMain.on('tray:resetNonce', (e, handlerId) => {
    accounts_1.default.resetNonce(handlerId);
});
electron_1.ipcMain.on('tray:removeOrigin', (e, handlerId) => {
    accounts_1.default.removeRequests(handlerId);
    store_1.default.removeOrigin(handlerId);
});
electron_1.ipcMain.on('tray:clearOrigins', () => {
    Object.keys((0, store_1.default)('main.origins')).forEach((handlerId) => {
        accounts_1.default.removeRequests(handlerId);
    });
    store_1.default.clearOrigins();
});
electron_1.ipcMain.on('tray:syncPath', (e, path, value) => {
    store_1.default.syncPath(path, value);
});
electron_1.ipcMain.on('tray:ready', () => {
    require('./api');
    if (!isDev) {
        startUpdater();
    }
});
electron_1.ipcMain.on('tray:updateRestart', () => {
    updater_1.default.quitAndInstall();
});
electron_1.ipcMain.on('frame:close', (e) => {
    windows_1.default.close(e);
});
electron_1.ipcMain.on('frame:min', (e) => {
    windows_1.default.min(e);
});
electron_1.ipcMain.on('frame:max', (e) => {
    windows_1.default.max(e);
});
electron_1.ipcMain.on('frame:unmax', (e) => {
    windows_1.default.unmax(e);
});
dapps_1.default.add({
    ens: 'send.frame.eth',
    checkStatusRetryCount: 0,
    openWhenReady: false,
    config: {
        key: 'value'
    },
    status: 'initial'
});
electron_1.ipcMain.on('unsetCurrentView', async (e) => {
    const win = electron_1.BrowserWindow.fromWebContents(e.sender);
    dapps_1.default.unsetCurrentView(win.frameId);
});
electron_1.ipcMain.on('*:addFrame', (e, id) => {
    const existingFrame = (0, store_1.default)('main.frames', id);
    if (existingFrame) {
        windows_1.default.refocusFrame(id);
    }
    else {
        store_1.default.addFrame({
            id,
            currentView: '',
            views: {}
        });
        dapps_1.default.open(id, 'send.frame.eth');
    }
});
electron_1.app.on('ready', () => {
    (0, menu_1.default)();
    windows_1.default.init();
    if (electron_1.app.dock)
        electron_1.app.dock.hide();
    if (isDev) {
        const loadDev = async () => {
            const { installDevTools, startCpuMonitoring } = await Promise.resolve().then(() => __importStar(require('./dev')));
            installDevTools();
            startCpuMonitoring();
        };
        void loadDev();
    }
    electron_1.protocol.interceptFileProtocol('file', (req, cb) => {
        const appOrigin = path_1.default.resolve(__dirname, '../../');
        const filePath = url_1.default.fileURLToPath(req.url);
        if (filePath.startsWith(appOrigin))
            cb({ path: filePath }); // eslint-disable-line
    });
});
electron_1.ipcMain.on('tray:action', (e, action, ...args) => {
    if (store_1.default[action])
        return store_1.default[action](...args);
    electron_log_1.default.info('Tray sent unrecognized action: ', action);
});
electron_1.app.on('second-instance', (event, argv, workingDirectory) => {
    electron_log_1.default.info(`second instance requested from directory: ${workingDirectory}`);
    windows_1.default.showTray();
});
electron_1.app.on('activate', () => windows_1.default.showTray());
electron_1.app.on('before-quit', () => {
    if (!updater_1.default.updateReady) {
        updater_1.default.stop();
    }
});
electron_1.app.on('will-quit', () => electron_1.app.quit());
electron_1.app.on('quit', () => {
    electron_log_1.default.info('Application closing');
    // await clients.stop()
    accounts_1.default.close();
    signers_1.default.close();
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
let launchStatus = (0, store_1.default)('main.launch');
store_1.default.observer(() => {
    if (launchStatus !== (0, store_1.default)('main.launch')) {
        launchStatus = (0, store_1.default)('main.launch');
        launchStatus ? launch.enable() : launch.disable();
    }
});
