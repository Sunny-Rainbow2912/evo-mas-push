"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tray = void 0;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const electron_log_1 = __importDefault(require("electron-log"));
const events_1 = __importDefault(require("events"));
const utils_1 = require("../../resources/utils");
const store_1 = __importDefault(require("../store"));
const frames_1 = __importDefault(require("./frames"));
const window_1 = require("./window");
const systemTray_1 = require("./systemTray");
const keyboardShortcuts_1 = require("../keyboardShortcuts");
const events = new events_1.default();
const frameManager = new frames_1.default();
const isDev = process.env.NODE_ENV === 'development';
const devToolsEnabled = isDev || process.env.ENABLE_DEV_TOOLS === 'true';
const fullheight = !!process.env.FULL_HEIGHT;
const openedAtLogin = electron_1.app?.getLoginItemSettings() && electron_1.app.getLoginItemSettings().wasOpenedAtLogin;
const windows = {};
const showOnReady = true;
const trayWidth = 400;
const devHeight = 800;
const isWindows = process.platform === 'win32';
const isMacOS = process.platform === 'darwin';
let tray;
let dash;
let onboard;
let notify;
let mouseTimeout;
let glide = false;
const app = {
    hide: () => {
        tray.hide();
        if (dash.isVisible()) {
            dash.hide('app');
        }
    },
    show: () => {
        tray.show();
        if (dash.hiddenByAppHide || dash.isVisible()) {
            store_1.default.setDash({ showing: true });
        }
    },
    toggle: () => {
        const eventName = tray.isVisible() ? 'hide' : 'show';
        app[eventName]();
    }
};
const systemTrayEventHandlers = {
    click: () => {
        if (isWindows) {
            app.toggle();
        }
    },
    clickHide: () => app.hide(),
    clickShow: () => app.show()
};
const systemTray = new systemTray_1.SystemTray(systemTrayEventHandlers);
const getDisplaySummonShortcut = () => (0, store_1.default)('main.shortcuts.altSlash');
const topRight = (window) => {
    const area = electron_1.screen.getDisplayNearestPoint(electron_1.screen.getCursorScreenPoint()).workArea;
    const screenSize = area;
    const windowSize = window.getSize();
    return {
        x: Math.floor(screenSize.x + screenSize.width - windowSize[0]),
        y: screenSize.y
    };
};
const center = (window) => {
    const area = electron_1.screen.getDisplayNearestPoint(electron_1.screen.getCursorScreenPoint()).workArea;
    const screenSize = area;
    const windowSize = window.getSize();
    return {
        x: Math.floor(screenSize.x + screenSize.width / 2 - windowSize[0] / 2),
        y: Math.floor(screenSize.y + screenSize.height / 2 - windowSize[1] / 2)
    };
};
const detectMouse = () => {
    const m1 = electron_1.screen.getCursorScreenPoint();
    const display = electron_1.screen.getDisplayNearestPoint(m1);
    const area = display.workArea;
    const bounds = display.bounds;
    const minX = area.width + area.x - 2;
    const center = (area.height + (area.y - bounds.y)) / 2;
    const margin = (area.height + (area.y - bounds.y)) / 2 - 5;
    m1.y = m1.y - area.y;
    const minY = center - margin;
    const maxY = center + margin;
    mouseTimeout = setTimeout(() => {
        if (m1.x >= minX && m1.y >= minY && m1.y <= maxY) {
            const m2 = electron_1.screen.getCursorScreenPoint();
            const area = electron_1.screen.getDisplayNearestPoint(m2).workArea;
            m2.y = m2.y - area.y;
            if (m2.x >= minX && m2.y === m1.y) {
                glide = true;
                app.show();
            }
            else {
                detectMouse();
            }
        }
        else {
            detectMouse();
        }
    }, 50);
};
function initWindow(id, opts) {
    // in development, serve files from local filesystem instead of the created bundle
    const url = isDev
        ? `http://localhost:1234/${id}/index.dev.html`
        : new URL(path_1.default.join(process.env.BUNDLE_LOCATION, `${id}.html`), 'file:');
    windows[id] = (0, window_1.createWindow)(id, opts);
    windows[id].loadURL(url.toString());
}
function initTrayWindow() {
    const trayOpts = {
        width: trayWidth,
        icon: path_1.default.join(__dirname, './AppIcon.png')
    };
    if (isMacOS) {
        trayOpts.type = 'panel';
    }
    initWindow('tray', trayOpts);
    windows.tray.on('closed', () => delete windows.tray);
    windows.tray.webContents.session.setPermissionRequestHandler((webContents, permission, res) => res(false));
    windows.tray.setResizable(false);
    windows.tray.setMovable(false);
    const { width, height, x, y } = electron_1.screen.getDisplayNearestPoint(electron_1.screen.getCursorScreenPoint()).workArea;
    windows.tray.setPosition(width + x, height + y);
    windows.tray.on('show', () => {
        if (process.platform === 'win32') {
            systemTray.closeContextMenu();
        }
        systemTray.setContextMenu('hide', { displaySummonShortcut: getDisplaySummonShortcut() });
    });
    windows.tray.on('hide', () => {
        if (process.platform === 'win32') {
            systemTray.closeContextMenu();
        }
        systemTray.setContextMenu('show', { displaySummonShortcut: getDisplaySummonShortcut() });
    });
    setTimeout(() => {
        windows.tray.on('focus', () => {
            if (isMacOS) {
                glide = false;
            }
            tray.show();
        });
    }, 2000);
    if (devToolsEnabled) {
        windows.tray.webContents.openDevTools();
    }
    setTimeout(() => {
        windows.tray.on('blur', () => {
            setTimeout(() => {
                if (tray.canAutoHide()) {
                    tray.hide();
                }
            }, 100);
        });
        windows.tray.focus();
    }, 1260);
    windows.tray.once('ready-to-show', () => {
        if (!openedAtLogin) {
            tray.show();
        }
    });
    setTimeout(() => {
        electron_1.screen.on('display-added', () => tray.hide());
        electron_1.screen.on('display-removed', () => tray.hide());
        electron_1.screen.on('display-metrics-changed', () => tray.hide());
    }, 30 * 1000);
}
class Tray {
    constructor() {
        this.recentDisplayEvent = false;
        this.ready = false;
        this.gasObserver = store_1.default.observer(() => {
            let title = '';
            if ((0, store_1.default)('platform') === 'darwin' && (0, store_1.default)('main.menubarGasPrice')) {
                const gasPrice = (0, store_1.default)('main.networksMeta.ethereum', 1, 'gas.price.levels.fast');
                if (!gasPrice)
                    return;
                const gasDisplay = Math.round((0, utils_1.hexToInt)(gasPrice) / 1000000000).toString();
                title = gasDisplay; // ɢ 🄶 Ⓖ ᴳᵂᴱᴵ
            }
            systemTray.setTitle(title);
        });
        this.readyHandler = () => {
            this.ready = true;
            systemTray.init(windows.tray);
            systemTray.setContextMenu('hide', { displaySummonShortcut: getDisplaySummonShortcut() });
            if (showOnReady) {
                store_1.default.trayOpen(true);
            }
            const showOnboardingWindow = !(0, store_1.default)('main.mute.onboardingWindow');
            const showNotifyWindow = !(0, store_1.default)('main.mute.migrateToPylon');
            if ((0, store_1.default)('windows.dash.showing') || showOnboardingWindow) {
                setTimeout(() => {
                    store_1.default.setDash({ showing: true });
                }, 300);
            }
            if (showOnboardingWindow && !showNotifyWindow) {
                setTimeout(() => {
                    store_1.default.setOnboard({ showing: true });
                }, 600);
            }
            if (showNotifyWindow) {
                setTimeout(() => {
                    store_1.default.setNotify({ showing: true });
                }, 600);
            }
        };
        electron_1.ipcMain.once('tray:ready', this.readyHandler);
        initTrayWindow();
    }
    isReady() {
        return this.ready;
    }
    isVisible() {
        return windows.tray.isVisible();
    }
    canAutoHide() {
        const autoHideOn = !!(0, store_1.default)('main.autohide');
        const dashShowing = !!(0, store_1.default)('windows.dash.showing');
        const onboardShowing = !!(0, store_1.default)('windows.onboard.showing');
        const isFrameShowing = frameManager.isFrameShowing();
        electron_log_1.default.debug(`%ccanAutoHide ${JSON.stringify({ autoHideOn, dashShowing, onboardShowing, isFrameShowing })}`, 'color: blue');
        return autoHideOn && !dashShowing && !onboardShowing && !isFrameShowing;
    }
    hide() {
        if (this.recentDisplayEvent || !windows.tray?.isVisible()) {
            return;
        }
        clearTimeout(this.recentDisplayEventTimeout);
        this.recentDisplayEvent = true;
        this.recentDisplayEventTimeout = setTimeout(() => {
            this.recentDisplayEvent = false;
        }, 150);
        store_1.default.toggleDash('hide');
        store_1.default.trayOpen(false);
        if ((0, store_1.default)('main.reveal')) {
            detectMouse();
        }
        windows.tray.emit('hide');
        windows.tray.hide();
        events.emit('tray:hide');
    }
    show() {
        clearTimeout(mouseTimeout);
        if (!windows.tray) {
            return init();
        }
        if (this.recentDisplayEvent) {
            return;
        }
        clearTimeout(this.recentDisplayEventTimeout);
        this.recentDisplayEvent = true;
        this.recentDisplayEventTimeout = setTimeout(() => {
            this.recentDisplayEvent = false;
        }, 150);
        if (isMacOS) {
            windows.tray.setPosition(0, 0);
        }
        else {
            windows.tray.setAlwaysOnTop(true);
        }
        windows.tray.setVisibleOnAllWorkspaces(true, {
            visibleOnFullScreen: true,
            skipTransformProcessType: true
        });
        windows.tray.setResizable(false); // Keeps height consistent
        const area = electron_1.screen.getDisplayNearestPoint(electron_1.screen.getCursorScreenPoint()).workArea;
        const height = isDev && !fullheight ? devHeight : area.height;
        windows.tray.setMinimumSize(trayWidth, height);
        windows.tray.setSize(trayWidth, height);
        windows.tray.setMaximumSize(trayWidth, height);
        const pos = topRight(windows.tray);
        windows.tray.setPosition(pos.x, pos.y);
        store_1.default.trayOpen(true);
        windows.tray.emit('show');
        if (glide && isMacOS) {
            windows.tray.showInactive();
        }
        else {
            windows.tray.show();
        }
        events.emit('tray:show');
        if (windows && windows.tray && windows.tray.focus && !glide) {
            windows.tray.focus();
        }
        windows.tray.setVisibleOnAllWorkspaces(false, {
            visibleOnFullScreen: true,
            skipTransformProcessType: true
        });
    }
    toggle() {
        if (!this.isReady())
            return;
        this.isVisible() ? this.hide() : this.show();
    }
    destroy() {
        this.gasObserver.remove();
        electron_1.ipcMain.off('tray:ready', this.readyHandler);
    }
}
exports.Tray = Tray;
class Dash {
    constructor() {
        this.recentDisplayEvent = false;
        this.hiddenByAppHide = false;
        const dashOpts = {
            width: trayWidth
        };
        if (isMacOS) {
            dashOpts.type = 'panel';
        }
        initWindow('dash', dashOpts);
    }
    hide(context) {
        if (this.recentDisplayEvent || !windows.dash?.isVisible()) {
            return;
        }
        if (context === 'app') {
            this.hiddenByAppHide = true;
        }
        clearTimeout(this.recentDisplayEventTimeout);
        this.recentDisplayEvent = true;
        this.recentDisplayEventTimeout = setTimeout(() => {
            this.recentDisplayEvent = false;
        }, 150);
        windows.dash.hide();
    }
    show() {
        if (!tray.isReady() || this.recentDisplayEvent) {
            return;
        }
        if (this.hiddenByAppHide) {
            this.hiddenByAppHide = false;
        }
        clearTimeout(this.recentDisplayEventTimeout);
        this.recentDisplayEvent = true;
        this.recentDisplayEventTimeout = setTimeout(() => {
            this.recentDisplayEvent = false;
        }, 150);
        setTimeout(() => {
            if (isMacOS) {
                windows.dash.setPosition(0, 0);
            }
            else {
                windows.dash.setAlwaysOnTop(true);
            }
            windows.dash.setVisibleOnAllWorkspaces(true, {
                visibleOnFullScreen: true,
                skipTransformProcessType: true
            });
            windows.dash.setResizable(false); // Keeps height consistent
            const area = electron_1.screen.getDisplayNearestPoint(electron_1.screen.getCursorScreenPoint()).workArea;
            const height = isDev && !fullheight ? devHeight : area.height;
            windows.dash.setMinimumSize(trayWidth, height);
            windows.dash.setSize(trayWidth, height);
            windows.dash.setMaximumSize(trayWidth, height);
            const { x, y } = topRight(windows.dash);
            windows.dash.setPosition(x - trayWidth - 5, y);
            windows.dash.show();
            if (!windows.tray.isVisible())
                windows.tray.show();
            windows.dash.focus();
            windows.dash.setVisibleOnAllWorkspaces(false, {
                visibleOnFullScreen: true,
                skipTransformProcessType: true
            });
            if (devToolsEnabled) {
                windows.dash.webContents.openDevTools();
            }
        }, 10);
    }
    isVisible() {
        return windows.dash.isVisible();
    }
}
class Onboard {
    constructor() {
        initWindow('onboard', {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            titleBarStyle: 'hidden',
            trafficLightPosition: { x: 10, y: 9 },
            icon: path_1.default.join(__dirname, './AppIcon.png')
        });
    }
    hide() {
        if (windows.onboard && windows.onboard.isVisible()) {
            windows.onboard.hide();
        }
    }
    show() {
        if (!tray.isReady()) {
            return;
        }
        const cleanupHandler = () => windows.onboard?.off('close', closeHandler);
        const closeHandler = () => {
            store_1.default.completeOnboarding();
            windows.tray.focus();
            electron_1.app.off('before-quit', cleanupHandler);
            delete windows.onboard;
        };
        setTimeout(() => {
            electron_1.app.on('before-quit', cleanupHandler);
            windows.onboard.once('close', closeHandler);
            const area = electron_1.screen.getDisplayNearestPoint(electron_1.screen.getCursorScreenPoint()).workArea;
            const height = (isDev && !fullheight ? devHeight : area.height) - 160;
            const maxWidth = Math.floor(height * 1.24);
            const targetWidth = 600; // area.width - 460
            const width = targetWidth > maxWidth ? maxWidth : targetWidth;
            windows.onboard.setMinimumSize(600, 300);
            windows.onboard.setSize(width, height);
            const pos = topRight(windows.onboard);
            // const x = (pos.x * 2 - width * 2 - 810) / 2
            const x = pos.x - 880;
            windows.onboard.setPosition(x, pos.y + 80);
            // windows.onboard.setAlwaysOnTop(true)
            windows.onboard.show();
            windows.onboard.focus();
            windows.onboard.setVisibleOnAllWorkspaces(false, {
                visibleOnFullScreen: true,
                skipTransformProcessType: true
            });
            if (devToolsEnabled) {
                windows.onboard.webContents.openDevTools();
            }
        }, 10);
    }
}
class Notify {
    constructor() {
        const notifyOpts = {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            titleBarStyle: 'hidden',
            trafficLightPosition: { x: 10, y: 9 },
            icon: path_1.default.join(__dirname, './AppIcon.png')
        };
        if (isMacOS) {
            notifyOpts.type = 'panel';
        }
        initWindow('notify', notifyOpts);
    }
    hide() {
        if (windows.notify && windows.notify.isVisible()) {
            windows.notify.hide();
        }
    }
    show() {
        if (!tray.isReady()) {
            return;
        }
        const cleanupHandler = () => windows.notify?.off('close', closeHandler);
        const closeHandler = () => {
            if (!(0, store_1.default)('main.mute.migrateToPylon')) {
                store_1.default.migrateToPylonConnections();
                store_1.default.mutePylonMigrationNotice();
            }
            if (!(0, store_1.default)('main.mute.onboardingWindow')) {
                store_1.default.setNotify({ showing: false });
                store_1.default.setOnboard({ showing: true });
            }
            windows.tray.focus();
            electron_1.app.off('before-quit', cleanupHandler);
            delete windows.notify;
        };
        setTimeout(() => {
            electron_1.app.on('before-quit', cleanupHandler);
            windows.notify.once('close', closeHandler);
            // const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea
            const height = 512;
            const maxWidth = Math.floor(height * 1.24);
            const targetWidth = 600; // area.width - 460
            const width = targetWidth > maxWidth ? maxWidth : targetWidth;
            windows.notify.setMinimumSize(600, 300);
            windows.notify.setSize(width, height);
            const pos = center(windows.notify);
            let x = pos.x - (trayWidth - 10) / 2;
            if ((0, store_1.default)('windows.dash.showing')) {
                const pos = topRight(windows.notify);
                x = pos.x - 880;
            }
            windows.notify.setPosition(x, pos.y);
            // windows.onboard.setAlwaysOnTop(true)
            windows.notify.show();
            windows.notify.focus();
            windows.notify.setVisibleOnAllWorkspaces(false, {
                visibleOnFullScreen: true,
                skipTransformProcessType: true
            });
            if (devToolsEnabled) {
                windows.notify.webContents.openDevTools();
            }
        }, 10);
    }
}
electron_1.ipcMain.on('tray:quit', () => electron_1.app.quit());
electron_1.ipcMain.on('tray:mouseout', () => {
    if (glide && !(windows.dash && windows.dash.isVisible())) {
        glide = false;
        app.hide();
    }
});
// deny navigation, webview attachment & new windows on creation of webContents
// also set elsewhere but enforced globally here to minimize possible vectors of attack
// - in the case of e.g. dependency injection
// - as a 'to be sure' against possibility of misconfiguration in the future
electron_1.app.on('web-contents-created', (_e, contents) => {
    contents.on('will-navigate', (e) => e.preventDefault());
    contents.on('will-attach-webview', (e) => e.preventDefault());
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});
electron_1.app.on('ready', () => {
    frameManager.start();
});
if (isDev) {
    electron_1.app.once('ready', () => {
        electron_1.globalShortcut.register('CommandOrControl+R', () => {
            Object.keys(windows).forEach((win) => {
                windows[win].reload();
            });
            // frameManager.reloadFrames()
        });
    });
}
electron_1.ipcMain.on('*:contextmenu', (e, x, y) => {
    if (isDev) {
        e.sender.inspectElement(x, y);
    }
});
const windowFromWebContents = (webContents) => electron_1.BrowserWindow.fromWebContents(webContents);
const init = () => {
    if (tray) {
        tray.destroy();
    }
    tray = new Tray();
    dash = new Dash();
    if (!(0, store_1.default)('main.mute.onboardingWindow')) {
        onboard = new Onboard();
    }
    if (!(0, store_1.default)('main.mute.migrateToPylon')) {
        notify = new Notify();
    }
    // data change events
    store_1.default.observer(() => {
        if ((0, store_1.default)('windows.dash.showing')) {
            dash.show();
        }
        else {
            dash.hide();
            windows.tray.focus();
        }
    }, 'windows:dash');
    store_1.default.observer(() => {
        if ((0, store_1.default)('windows.onboard.showing')) {
            if (!windows.onboard) {
                onboard = new Onboard();
            }
            onboard.show();
        }
        else if (onboard) {
            onboard.hide();
            windows.tray.focus();
        }
    }, 'windows:onboard');
    store_1.default.observer(() => {
        if ((0, store_1.default)('windows.notify.showing')) {
            if (!windows.notify) {
                notify = new Notify();
            }
            notify.show();
        }
        else if (notify) {
            notify.hide();
            windows.tray.focus();
        }
    }, 'windows:notify');
    store_1.default.observer(() => broadcast('permissions', JSON.stringify((0, store_1.default)('permissions'))));
    store_1.default.observer(() => {
        let summonShortcut = (0, store_1.default)('main.shortcuts.summon');
        const summonHandler = (accelerator) => {
            app.toggle();
            if ((0, store_1.default)('windows.onboard.showing')) {
                send('onboard', 'main:flex', 'shortcutActivated');
            }
            if (tray?.isReady()) {
                systemTray.setContextMenu(tray.isVisible() ? 'hide' : 'show', {
                    displaySummonShortcut: summonShortcut.enabled,
                    accelerator
                });
            }
        };
        (0, keyboardShortcuts_1.registerShortcut)(summonShortcut, summonHandler);
    });
};
const send = (id, channel, ...args) => {
    if (windows[id] && !windows[id].isDestroyed()) {
        windows[id].webContents.send(channel, ...args);
    }
    else {
        electron_log_1.default.error(new Error(`A window with id "${id}" does not exist (windows.send)`));
    }
};
const broadcast = (channel, ...args) => {
    Object.keys(windows).forEach((id) => send(id, channel, ...args));
    frameManager.broadcast(channel, args);
};
store_1.default.api.feed((_state, actions) => {
    broadcast('main:action', 'stateSync', JSON.stringify(actions));
});
exports.default = {
    toggleTray() {
        tray.toggle();
    },
    showTray() {
        tray.show();
    },
    refocusFrame(frameId) {
        frameManager.refocus(frameId);
    },
    close(e) {
        windowFromWebContents(e.sender).close();
    },
    max(e) {
        windowFromWebContents(e.sender).maximize();
    },
    unmax(e) {
        windowFromWebContents(e.sender).unmaximize();
    },
    min(e) {
        windowFromWebContents(e.sender).minimize();
    },
    init
};
