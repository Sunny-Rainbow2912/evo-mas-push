"use strict";
// Manage navigation states for each window
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const store_1 = __importDefault(require("../../store"));
const nav = {
    forward: (windowId, crumb) => {
        // Adds new crumb to nav array
        store_1.default.navForward(windowId, crumb);
    },
    back: (windowId, steps = 1) => {
        // Removes last crumb from nav array
        store_1.default.navBack(windowId, steps);
    },
    update: (windowId, crumb, navigate = true) => {
        // Updated last crumb in nav array with new data
        // Replaces last crumb when navigate is false
        // Adds new crumb to nav array when navigate is true
        store_1.default.navUpdate(windowId, crumb, navigate);
    }
};
electron_1.ipcMain.on('nav:forward', (e, windowId, crumb) => {
    nav.forward(windowId, crumb);
});
electron_1.ipcMain.on('nav:back', (e, windowId, steps = 1) => {
    nav.back(windowId, steps);
});
electron_1.ipcMain.on('nav:update', (e, windowId, crumb, navigate) => {
    nav.update(windowId, crumb, navigate);
});
exports.default = nav;
