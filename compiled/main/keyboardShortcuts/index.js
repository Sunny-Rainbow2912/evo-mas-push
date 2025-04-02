"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerShortcut = void 0;
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
const mappings_1 = require("../../resources/keyboard/mappings");
const stringifyShortcut = ({ modifierKeys, shortcutKey }) => ({
    shortcutString: [...modifierKeys, shortcutKey].join('+'),
    accelerator: [...modifierKeys.slice().sort(), mappings_1.shortcutKeyMap[shortcutKey] || shortcutKey].join('+')
});
function unregister(shortcut) {
    const { shortcutString, accelerator } = stringifyShortcut(shortcut);
    electron_log_1.default.verbose(`Unregistering accelerator "${accelerator}" for shortcut: ${shortcutString}`);
    try {
        electron_1.globalShortcut.unregister(accelerator);
    }
    catch (e) {
        electron_log_1.default.error(`Failed to unregister accelerator "${accelerator}" for shortcut: ${shortcutString}`, e);
    }
}
function register(shortcut, shortcutHandler) {
    const { shortcutString, accelerator } = stringifyShortcut(shortcut);
    electron_log_1.default.verbose(`Registering accelerator "${accelerator}" for shortcut: ${shortcutString}`);
    try {
        if (shortcut.enabled && !shortcut.configuring) {
            electron_1.globalShortcut.register(accelerator, () => shortcutHandler(accelerator));
            electron_log_1.default.info(`Accelerator "${accelerator}" registered for shortcut: ${shortcutString}`);
        }
    }
    catch (e) {
        electron_log_1.default.error(`Failed to register accelerator "${accelerator}" for shortcut: ${shortcutString}`, e);
    }
}
const registerShortcut = (shortcut, shortcutHandler) => {
    unregister(shortcut);
    register(shortcut, shortcutHandler);
};
exports.registerShortcut = registerShortcut;
