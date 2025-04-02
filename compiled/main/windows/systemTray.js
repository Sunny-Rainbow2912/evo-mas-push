"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemTray = void 0;
// @ts-ignore
const getos_1 = __importDefault(require("getos"));
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
const utils_1 = require("../../resources/utils");
const isMacOS = process.platform === 'darwin';
let isUbuntu23OrGreater = false;
if (process.platform === 'linux') {
    try {
        (0, getos_1.default)((error, osInfo) => {
            if (error) {
                console.error('Could not determine Linux version', error);
            }
            else {
                if (osInfo.dist === 'Ubuntu' && osInfo.release) {
                    const majorVersion = parseInt(osInfo.release.split('.')[0], 10);
                    isUbuntu23OrGreater = majorVersion >= 23;
                }
            }
        });
    }
    catch (error) {
        console.error('Could not determine Linux version', error);
    }
}
const delaySettingContextMenu = () => !isMacOS && !isUbuntu23OrGreater;
class SystemTray {
    constructor(clickHandlers) {
        this.clickHandlers = clickHandlers;
    }
    init(mainWindow) {
        // Electron Tray can only be instantiated when the app is ready
        this.electronTray = new electron_1.Tray(path_1.default.join(__dirname, isMacOS ? './IconTemplate.png' : './Icon.png'));
        this.electronTray.on('click', (_event, bounds) => {
            const mainWindowBounds = mainWindow.getBounds();
            const currentDisplay = electron_1.screen.getDisplayMatching(bounds);
            const trayClickDisplay = electron_1.screen.getDisplayMatching(mainWindowBounds);
            if (trayClickDisplay.id !== currentDisplay.id) {
                this.setContextMenu('show', { switchScreen: true });
            }
            this.clickHandlers.click();
        });
    }
    setContextMenu(type, { displaySummonShortcut = false, accelerator = 'Alt+/', switchScreen = false }) {
        const separatorMenuItem = {
            label: 'Frame',
            click: () => { },
            type: 'separator'
        };
        const menuItemLabelMap = {
            hide: 'Dismiss',
            show: 'Summon'
        };
        const label = menuItemLabelMap[type];
        const eventName = `click${(0, utils_1.capitalize)(type)}`;
        const actionMenuItem = {
            label,
            click: () => this.clickHandlers[eventName](),
            toolTip: `${label} Frame`
        };
        const quitMenuItem = {
            label: 'Quit',
            click: () => electron_1.app.quit()
        };
        if (displaySummonShortcut) {
            actionMenuItem.accelerator = accelerator;
            actionMenuItem.registerAccelerator = false;
        }
        const menu = electron_1.Menu.buildFromTemplate([actionMenuItem, separatorMenuItem, quitMenuItem]);
        if (switchScreen) {
            this.electronTray?.setContextMenu(menu);
        }
        else {
            setTimeout(() => this.electronTray?.setContextMenu(menu), delaySettingContextMenu() ? 200 : 0);
        }
    }
    closeContextMenu() {
        this.electronTray?.closeContextMenu();
    }
    setTitle(title) {
        this.electronTray?.setTitle(title);
    }
}
exports.SystemTray = SystemTray;
