"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShortcutFromKeyEvent = exports.getDisplayShortcut = exports.isShortcutKey = void 0;
const link_1 = __importDefault(require("../link"));
const mappings_1 = require("./mappings");
// https://www.w3.org/TR/uievents-code/#keyboard-101
const isUSLayout = () => keyboardLayout?.get('Backslash') === '\\';
let keyboardLayout;
if (global?.navigator) {
    navigator.keyboard.getLayoutMap().then((layout) => {
        keyboardLayout = layout;
        link_1.default.send('tray:action', 'setKeyboardLayout', {
            isUS: isUSLayout()
        });
    });
    // TODO: keyboard layoutchange event listener when Electron supports it
    // navigator.keyboard.addEventListener('layoutchange', () => { keyboardLayout = layout })
}
const isShortcutKey = (keyEvent) => keyEvent.code in mappings_1.shortcutKeyMap;
exports.isShortcutKey = isShortcutKey;
function getModifierKey(key, platform) {
    const isMacOS = platform === 'darwin';
    if (key === 'Alt') {
        return isMacOS ? 'Option' : 'Alt';
    }
    if (key === 'Control' || key === 'CommandOrCtrl') {
        return isMacOS ? 'Control' : 'Ctrl';
    }
    if (key === 'Meta' || key === 'Super') {
        return mappings_1.metaKeyMap[platform];
    }
    return key;
}
const getDisplayShortcut = (platform, shortcut) => {
    const key = keyboardLayout?.get(shortcut.shortcutKey) || shortcut.shortcutKey;
    const shortcutKey = key.length === 1 && key.charCodeAt(0) >= 65 && key.charCodeAt(0) <= 122 ? key.toLocaleUpperCase() : key;
    const modifierKeys = shortcut.modifierKeys.map((key) => getModifierKey(keyboardLayout?.get(key) || key, platform));
    return { modifierKeys, shortcutKey };
};
exports.getDisplayShortcut = getDisplayShortcut;
const getShortcutFromKeyEvent = (e, pressedKeyCodes, platform) => {
    const isWindows = platform === 'win32';
    const altGrPressed = !e.altKey && pressedKeyCodes.includes(17) && pressedKeyCodes.includes(18);
    const modifierKeys = [];
    if (isWindows && altGrPressed) {
        modifierKeys.push('Alt', 'Control');
    }
    if (e.altKey) {
        modifierKeys.push('Alt');
    }
    if (e.ctrlKey) {
        modifierKeys.push('Control');
    }
    if (e.metaKey) {
        modifierKeys.push('Meta');
    }
    return {
        modifierKeys,
        shortcutKey: e.code
    };
};
exports.getShortcutFromKeyEvent = getShortcutFromKeyEvent;
