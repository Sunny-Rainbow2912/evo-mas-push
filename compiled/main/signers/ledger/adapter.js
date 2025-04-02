"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_log_1 = __importDefault(require("electron-log"));
const hw_transport_node_hid_noevents_1 = require("@ledgerhq/hw-transport-node-hid-noevents");
const hw_transport_node_hid_singleton_1 = __importDefault(require("@ledgerhq/hw-transport-node-hid-singleton"));
const derive_1 = require("../Signer/derive");
const adapters_1 = require("../adapters");
const Ledger_1 = __importDefault(require("./Ledger"));
const store_1 = __importDefault(require("../../store"));
function updateDerivation(ledger, derivation = (0, store_1.default)('main.ledger.derivation'), accountLimit = 0) {
    const liveAccountLimit = accountLimit || (derivation === derive_1.Derivation.live ? (0, store_1.default)('main.ledger.liveAccountLimit') : 0);
    ledger.derivation = derivation;
    ledger.accountLimit = liveAccountLimit;
}
class LedgerSignerAdapter extends adapters_1.SignerAdapter {
    constructor() {
        super('ledger');
        this.usbListener = null;
        this.knownSigners = {};
        this.disconnections = [];
    }
    open() {
        this.observer = store_1.default.observer(() => {
            const ledgerDerivation = (0, store_1.default)('main.ledger.derivation');
            const liveAccountLimit = (0, store_1.default)('main.ledger.liveAccountLimit');
            Object.values(this.knownSigners).forEach((ledger) => {
                if (ledger.derivation !== ledgerDerivation ||
                    (ledger.derivation === 'live' && ledger.accountLimit !== liveAccountLimit)) {
                    updateDerivation(ledger, ledgerDerivation, liveAccountLimit);
                    ledger.deriveAddresses();
                }
            });
        });
        this.usbListener = hw_transport_node_hid_singleton_1.default.listen({
            next: (evt) => {
                electron_log_1.default.debug(`received ${evt.type} USB event`);
                if (!evt.deviceModel) {
                    electron_log_1.default.warn('received USB event with no Ledger device model', evt);
                    return;
                }
                this.handleDeviceChanges();
            },
            complete: () => {
                electron_log_1.default.debug('received USB complete event');
            },
            error: (err) => {
                electron_log_1.default.error('USB error', err);
            }
        });
        super.open();
    }
    close() {
        if (this.observer) {
            this.observer.remove();
            this.observer = null;
        }
        if (this.usbListener) {
            this.usbListener.unsubscribe();
            this.usbListener = null;
        }
        super.close();
    }
    remove(ledger) {
        if (ledger.devicePath in this.knownSigners) {
            electron_log_1.default.info(`removing Ledger ${ledger.model} attached at ${ledger.devicePath}`);
            delete this.knownSigners[ledger.devicePath];
            ledger.close();
        }
    }
    reload(ledger) {
        electron_log_1.default.info(`reloading  Ledger ${ledger.model} attached at ${ledger.devicePath}`);
        const signer = this.knownSigners[ledger.devicePath];
        if (signer) {
            signer
                .disconnect()
                .then(() => signer.open())
                .then(() => signer.connect());
        }
    }
    handleDeviceChanges() {
        const { attachedDevices, detachedLedgers, reconnections, pendingDisconnections } = this.detectDeviceChanges();
        this.disconnections = pendingDisconnections;
        detachedLedgers.forEach((ledger) => this.handleDisconnectedDevice(ledger));
        reconnections.forEach((disconnection) => this.handleReconnectedDevice(disconnection));
        attachedDevices.forEach((device) => this.handleAttachedDevice(device));
    }
    async handleAttachedDevice(device) {
        electron_log_1.default.info(`Ledger ${device.product} attached at ${device.path}`);
        const ledger = new Ledger_1.default(device.path, device.product);
        const emitUpdate = () => this.emit('update', ledger);
        ledger.on('update', emitUpdate);
        ledger.on('error', emitUpdate);
        ledger.on('lock', emitUpdate);
        ledger.on('close', () => {
            this.emit('remove', ledger.id);
        });
        ledger.on('unlock', () => {
            ledger.connect();
        });
        this.knownSigners[ledger.devicePath] = ledger;
        this.emit('add', ledger);
        // Show signer in dash window
        store_1.default.navReplace('dash', [
            {
                view: 'expandedSigner',
                data: { signer: ledger.id }
            },
            {
                view: 'accounts',
                data: {}
            }
        ]);
        await this.handleConnectedDevice(ledger);
    }
    async handleConnectedDevice(ledger) {
        updateDerivation(ledger);
        await ledger.open();
        await ledger.connect();
    }
    async handleReconnectedDevice(disconnection) {
        electron_log_1.default.info(`Ledger ${disconnection.device.model} re-connected at ${disconnection.device.devicePath}`);
        clearTimeout(disconnection.timeout);
        this.handleConnectedDevice(disconnection.device);
    }
    handleDisconnectedDevice(ledger) {
        electron_log_1.default.info(`Ledger ${ledger.model} disconnected from ${ledger.devicePath}`);
        ledger.disconnect();
        // when a user exits the eth app, it takes a few seconds for the
        // main ledger to reconnect via USB, so attempt to wait for this event
        // instead of immediately removing the signer
        this.disconnections.push({
            device: ledger,
            timeout: setTimeout(() => {
                const index = this.disconnections.findIndex((d) => d.device.devicePath === ledger.devicePath);
                this.disconnections.splice(index, 1);
                electron_log_1.default.info(`Ledger ${ledger.model} detached from ${ledger.devicePath}`);
                this.remove(ledger);
            }, 5000)
        });
    }
    detectDeviceChanges() {
        // all Ledger devices that are currently connected
        const ledgerDevices = (0, hw_transport_node_hid_noevents_1.getDevices)()
            .filter((device) => !!device.path)
            .map((d) => ({ ...d, path: d.path, product: d.product || '' }));
        const { pendingDisconnections, reconnections } = this.getReconnectedLedgers(ledgerDevices);
        const detachedLedgers = this.getDetachedLedgers(ledgerDevices);
        const attachedDevices = this.getAttachedDevices(ledgerDevices).filter((device) => !reconnections.some((r) => r.device.devicePath === device.path));
        return {
            attachedDevices,
            detachedLedgers,
            pendingDisconnections,
            reconnections
        };
    }
    getAttachedDevices(connectedDevices) {
        // attached devices are ones where a connected device
        // is not yet one of the currently known signers
        return connectedDevices.filter((device) => !(device.path in this.knownSigners));
    }
    getDetachedLedgers(connectedDevices) {
        // detached Ledgers are previously known signers that are
        // no longer one of the connected Ledger devices
        return Object.values(this.knownSigners).filter((signer) => !connectedDevices.some((device) => device.path === signer.devicePath));
    }
    getReconnectedLedgers(connectedDevices) {
        // group all the disconnections into ones that are either accounted for
        // by the currently connected devices (reconnections) or ones that are still
        // pending (pendingDisconnections)
        const { pendingDisconnections, reconnections } = this.disconnections.reduce((resolved, disconnection) => {
            if (connectedDevices.some((device) => device.path === disconnection.device.devicePath)) {
                resolved.reconnections.push(disconnection);
            }
            else {
                resolved.pendingDisconnections.push(disconnection);
            }
            return resolved;
        }, { pendingDisconnections: [], reconnections: [] });
        // if we are still waiting on reconnections, check if any more devices have been added. if so, assume
        // that these are the reconnection events and allow any newly connected device to take the place
        // of a disconnected one. this mostly happens on Windows because the devices reconnect at a different
        // device path from the one from which they were disconnected
        while (pendingDisconnections.length > 0) {
            const reconnectedDevice = connectedDevices.find((device) => !reconnections.some((r) => r.device.devicePath === device.path) && !this.knownSigners[device.path]);
            if (reconnectedDevice) {
                const disconnection = pendingDisconnections.pop();
                this.knownSigners[reconnectedDevice.path] = disconnection.device;
                delete this.knownSigners[disconnection.device.devicePath];
                disconnection.device.devicePath = reconnectedDevice.path;
                reconnections.push(disconnection);
            }
            else
                break;
        }
        return { pendingDisconnections, reconnections };
    }
}
exports.default = LedgerSignerAdapter;
