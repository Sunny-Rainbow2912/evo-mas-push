"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_log_1 = __importDefault(require("electron-log"));
function inventory(pylon, store) {
    function handleUpdates(updates) {
        if (updates.length === 0)
            return;
        electron_log_1.default.debug(`got inventory updates for ${updates.map((u) => u.id)}`);
        updates.forEach((update) => {
            store.setInventory(update.id, update.data.inventory);
        });
    }
    function start() {
        electron_log_1.default.verbose('starting inventory updates');
        pylon.on('inventories', handleUpdates);
    }
    function stop() {
        electron_log_1.default.verbose('stopping inventory updates');
        pylon.inventories([]);
        pylon.off('inventories', handleUpdates);
    }
    function setAddresses(addresses) {
        electron_log_1.default.verbose('setting addresses for inventory updates', addresses);
        pylon.inventories(addresses);
    }
    return {
        start,
        stop,
        setAddresses
    };
}
exports.default = inventory;
