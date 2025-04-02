"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_log_1 = __importDefault(require("electron-log"));
const adapters_1 = require("../adapters");
const store_1 = __importDefault(require("../../store"));
const Lattice_1 = __importDefault(require("./Lattice"));
function getLatticeSettings(deviceId) {
    const { baseUrl, derivation, accountLimit } = getGlobalLatticeSettings();
    const device = (0, store_1.default)('main.lattice', deviceId);
    return { ...device, baseUrl, derivation, accountLimit };
}
function getGlobalLatticeSettings() {
    const accountLimit = (0, store_1.default)('main.latticeSettings.accountLimit');
    const derivation = (0, store_1.default)('main.latticeSettings.derivation');
    const endpointMode = (0, store_1.default)('main.latticeSettings.endpointMode');
    const baseUrl = endpointMode === 'custom' ? (0, store_1.default)('main.latticeSettings.endpointCustom') : 'https://signing.gridpl.us';
    return { baseUrl, derivation, accountLimit };
}
class LatticeAdapter extends adapters_1.SignerAdapter {
    constructor() {
        super('lattice');
        this.knownSigners = {};
    }
    open() {
        this.settingsObserver = store_1.default.observer(() => {
            const { baseUrl, derivation, accountLimit } = getGlobalLatticeSettings();
            Object.values(this.knownSigners).forEach((lattice) => {
                if (!lattice.connection)
                    return;
                let needsUpdate = false, reloadAddresses = false;
                if (derivation !== lattice.derivation) {
                    lattice.derivation = derivation;
                    lattice.addresses = [];
                    reloadAddresses = true;
                }
                if (accountLimit !== lattice.accountLimit) {
                    lattice.accountLimit = accountLimit;
                    reloadAddresses = reloadAddresses || lattice.addresses.length < lattice.accountLimit;
                    needsUpdate = true;
                }
                if (baseUrl !== lattice.connection.baseUrl) {
                    // if any connection settings have changed, re-connect
                    this.reload(lattice);
                }
                else if (reloadAddresses) {
                    lattice.deriveAddresses();
                }
                else if (needsUpdate) {
                    this.emit('update', lattice);
                }
            });
        }, 'latticeSettings');
        this.signerObserver = store_1.default.observer(() => {
            const devices = (0, store_1.default)('main.lattice') || {};
            Object.entries(devices).forEach(([deviceId, device]) => {
                if (deviceId in this.knownSigners)
                    return;
                electron_log_1.default.info('Initializing Lattice device', { deviceId });
                const { deviceName, tag, baseUrl, privKey, accountLimit } = getLatticeSettings(deviceId);
                const lattice = new Lattice_1.default(deviceId, deviceName, tag);
                lattice.accountLimit = accountLimit;
                const emitUpdate = () => this.emit('update', lattice);
                lattice.on('update', emitUpdate);
                lattice.on('connect', (paired) => {
                    store_1.default.updateLattice(deviceId, { paired });
                    if (paired) {
                        // Lattice recognizes the private key and remembers if this
                        // client is already paired between sessions
                        const { derivation } = getLatticeSettings(deviceId);
                        lattice.deriveAddresses(derivation);
                    }
                });
                lattice.on('paired', (hasActiveWallet) => {
                    store_1.default.updateLattice(deviceId, { paired: true });
                    if (hasActiveWallet) {
                        const { derivation } = getLatticeSettings(deviceId);
                        lattice.deriveAddresses(derivation);
                    }
                });
                lattice.on('error', () => {
                    if (lattice.connection && !lattice.connection.isPaired) {
                        store_1.default.updateLattice(deviceId, { paired: false });
                    }
                    lattice.disconnect();
                    emitUpdate();
                });
                lattice.on('close', () => {
                    delete this.knownSigners[deviceId];
                    this.emit('remove', lattice.id);
                });
                this.knownSigners[deviceId] = lattice;
                this.emit('add', lattice);
                if (device.paired) {
                    // don't attempt to automatically connect if the Lattice isn't
                    // paired as this could happen without the user noticing
                    lattice.connect(baseUrl, privKey).catch(() => {
                        store_1.default.updateLattice(deviceId, { paired: false });
                    });
                }
            });
        }, 'latticeSigners');
    }
    close() {
        if (this.signerObserver) {
            this.signerObserver.remove();
            this.signerObserver = null;
        }
        if (this.settingsObserver) {
            this.settingsObserver.remove();
            this.settingsObserver = null;
        }
        this.knownSigners = {};
    }
    remove(lattice) {
        electron_log_1.default.info(`removing Lattice ${lattice.deviceId}`);
        store_1.default.removeLattice(lattice.deviceId);
        if (lattice.deviceId in this.knownSigners) {
            lattice.close();
        }
    }
    async reload(lattice) {
        electron_log_1.default.info(`reloading Lattice ${lattice.deviceId}`);
        lattice.disconnect();
        const { baseUrl, privKey } = getLatticeSettings(lattice.deviceId);
        try {
            await lattice.connect(baseUrl, privKey);
        }
        catch (e) {
            electron_log_1.default.error('could not reload Lattice', e);
        }
    }
}
exports.default = LatticeAdapter;
