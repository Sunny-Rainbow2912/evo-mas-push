"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openBlockExplorer = exports.openExternal = exports.createViewInstance = exports.createWindow = void 0;
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
const path_1 = __importDefault(require("path"));
const store_1 = __importDefault(require("../store"));
function createWindow(name, opts, webPreferences = {}) {
    electron_log_1.default.verbose(`Creating ${name} window`);
    const browserWindow = new electron_1.BrowserWindow({
        ...opts,
        frame: false,
        acceptFirstMouse: true,
        transparent: process.platform === 'darwin',
        show: false,
        backgroundColor: (0, store_1.default)('main.colorwayPrimary', (0, store_1.default)('main.colorway'), 'background'),
        skipTaskbar: process.platform !== 'linux',
        webPreferences: {
            ...webPreferences,
            preload: path_1.default.resolve(process.env.BUNDLE_LOCATION, 'bridge.js'),
            backgroundThrottling: false,
            contextIsolation: true,
            webviewTag: false,
            sandbox: true,
            defaultEncoding: 'utf-8',
            nodeIntegration: false,
            scrollBounce: true,
            navigateOnDragDrop: false,
            disableBlinkFeatures: 'Auxclick'
        }
    });
    browserWindow.webContents.once('did-finish-load', () => {
        electron_log_1.default.info(`Created ${name} renderer process, pid:`, browserWindow.webContents.getOSProcessId());
    });
    browserWindow.webContents.on('will-navigate', (e) => e.preventDefault()); // Prevent navigation
    browserWindow.webContents.on('will-attach-webview', (e) => e.preventDefault()); // Prevent attaching <webview>
    browserWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' })); // Prevent new windows
    return browserWindow;
}
exports.createWindow = createWindow;
function createViewInstance(ens = '', webPreferences = {}) {
    const viewInstance = new electron_1.BrowserView({
        webPreferences: {
            ...webPreferences,
            contextIsolation: true,
            webviewTag: false,
            sandbox: true,
            defaultEncoding: 'utf-8',
            nodeIntegration: false,
            scrollBounce: true,
            navigateOnDragDrop: false,
            disableBlinkFeatures: 'Auxclick',
            preload: path_1.default.resolve('./main/windows/viewPreload.js'),
            partition: `persist:${ens}`
        }
    });
    viewInstance.webContents.on('will-navigate', (e) => e.preventDefault());
    viewInstance.webContents.on('will-attach-webview', (e) => e.preventDefault());
    viewInstance.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    return viewInstance;
}
exports.createViewInstance = createViewInstance;
const externalWhitelist = [
    'https://evotrade.io',
    'https://github.com/floating/frame/issues/new',
    'https://github.com/floating/frame/blob/master/LICENSE',
    'https://github.com/floating/frame/blob/0.5/LICENSE',
    'https://shop.ledger.com/pages/ledger-nano-x?r=1fb484cde64f',
    'https://shop.trezor.io/?offer_id=10&aff_id=3270',
    'https://discord.gg/UH7NGqY',
    'https://frame.canny.io',
    'https://frame.sh',
    'https://opensea.io'
];
const isValidReleasePage = (url) => url.startsWith('https://github.com/floating/frame/releases/tag/');
const isWhitelistedHost = (url) => externalWhitelist.some((entry) => url === entry || url.startsWith(entry + '/'));
function openExternal(url = '') {
    if (isWhitelistedHost(url) || isValidReleasePage(url)) {
        electron_1.shell.openExternal(url);
    }
}
exports.openExternal = openExternal;
function openBlockExplorer({ id, type }, hash, account) {
    // remove trailing slashes from the base url
    const explorer = ((0, store_1.default)('main.networks', type, id, 'explorer') || '').replace(/\/+$/, '');
    if (explorer) {
        if (hash) {
            const hashPath = hash && `/tx/${hash}`;
            electron_1.shell.openExternal(`${explorer}${hashPath}`);
        }
        else if (account) {
            const accountPath = account && `/address/${account}`;
            electron_1.shell.openExternal(`${explorer}${accountPath}`);
        }
        else {
            electron_1.shell.openExternal(`${explorer}`);
        }
    }
}
exports.openBlockExplorer = openBlockExplorer;
