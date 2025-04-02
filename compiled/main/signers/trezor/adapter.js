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
const electron_log_1 = __importDefault(require("electron-log"));
const adapters_1 = require("../adapters");
const Trezor_1 = __importStar(require("./Trezor"));
const store_1 = __importDefault(require("../../store"));
const bridge_1 = __importDefault(require("./bridge"));
class TrezorSignerAdapter extends adapters_1.SignerAdapter {
    constructor() {
        super('trezor');
        this.knownSigners = {};
    }
    open() {
        this.observer = store_1.default.observer(() => {
            const trezorDerivation = (0, store_1.default)('main.trezor.derivation');
            Object.values(this.knownSigners).forEach((signerInfo) => {
                const trezor = signerInfo.signer;
                if (trezor.derivation !== trezorDerivation) {
                    trezor.derivation = trezorDerivation;
                    if (trezor.status === Trezor_1.Status.OK) {
                        trezor.deriveAddresses();
                    }
                }
            });
        });
        bridge_1.default.on('trezor:detected', (path) => {
            // create a new signer whenever a Trezor is detected, but it won't be opened
            // until a connect event with an active device is received
            const id = Trezor_1.default.generateId(path);
            if (!this.knownSigners[id]) {
                this.initTrezor(path);
            }
        });
        bridge_1.default.on('trezor:connect', async (device) => {
            const id = Trezor_1.default.generateId(device.path);
            const trezor = this.knownSigners[id]?.signer || this.initTrezor(device.path);
            trezor.derivation = (0, store_1.default)('main.trezor.derivation');
            try {
                await trezor.open(device);
                const version = [trezor.appVersion.major, trezor.appVersion.minor, trezor.appVersion.patch].join('.');
                electron_log_1.default.info(`Trezor ${trezor.id} connected: ${trezor.model}, firmware v${version}`);
                // arbitrary delay to attempt to minimize message conflicts on first connection
                setTimeout(() => trezor.deriveAddresses(), 200);
            }
            catch (e) {
                electron_log_1.default.error('could not open Trezor', e);
            }
        });
        bridge_1.default.on('trezor:disconnect', (device) => {
            this.withSigner(device, (signer) => {
                electron_log_1.default.info(`Trezor ${signer.id} disconnected`);
                this.remove(signer);
            });
        });
        bridge_1.default.on('trezor:update', (device) => {
            this.withSigner(device, (signer) => {
                electron_log_1.default.debug(`Trezor ${signer.id} updated`);
                signer.device = device;
            });
        });
        bridge_1.default.on('trezor:entered:pin', (deviceId) => {
            electron_log_1.default.verbose(`Trezor ${deviceId} pin entered`);
            this.handleEvent(deviceId, 'trezor:entered:pin');
        });
        bridge_1.default.on('trezor:entered:passphrase', (deviceId) => {
            electron_log_1.default.verbose(`Trezor ${deviceId} passphrase entered`);
            this.handleEvent(deviceId, 'trezor:entered:passphrase');
        });
        bridge_1.default.on('trezor:enteringPhrase', (deviceId) => {
            electron_log_1.default.verbose(`Trezor ${deviceId} waiting for passphrase entry on device`);
            const signer = this.knownSigners[deviceId].signer;
            // const currentStatus = signer.status
            // this.addEventHandler(signer, 'trezor:entered:passphrase', () => {
            //   signer.status = currentStatus
            //   this.emit('update', signer)
            // })
            signer.status = Trezor_1.Status.ENTERING_PASSPHRASE;
            this.emit('update', signer);
        });
        bridge_1.default.on('trezor:needPin', (device) => {
            this.withSigner(device, (signer) => {
                electron_log_1.default.verbose(`Trezor ${signer.id} needs pin`);
                const currentStatus = signer.status;
                this.addEventHandler(signer, 'trezor:entered:pin', () => {
                    signer.status = currentStatus;
                    this.emit('update', signer);
                });
                signer.status = Trezor_1.Status.NEEDS_PIN;
                this.emit('update', signer);
            });
        });
        bridge_1.default.on('trezor:needPhrase', (device) => {
            this.withSigner(device, (signer) => {
                electron_log_1.default.verbose(`Trezor ${signer.id} needs passphrase`, { status: signer.status });
                const currentStatus = signer.status;
                this.addEventHandler(signer, 'trezor:entered:passphrase', () => {
                    signer.status = currentStatus;
                    this.emit('update', signer);
                });
                signer.status = Trezor_1.Status.NEEDS_PASSPHRASE;
                this.emit('update', signer);
            });
        });
        bridge_1.default.open();
        super.open();
    }
    initTrezor(path) {
        const trezor = new Trezor_1.default(path);
        electron_log_1.default.info(`Trezor ${trezor.id} detected`);
        trezor.on('close', () => {
            this.emit('remove', trezor.id);
        });
        trezor.on('update', () => {
            this.emit('update', trezor);
        });
        this.knownSigners[trezor.id] = { signer: trezor, eventHandlers: {} };
        this.emit('add', trezor);
        // Show signer in dash window
        store_1.default.navReplace('dash', [
            {
                view: 'expandedSigner',
                data: { signer: trezor.id }
            },
            {
                view: 'accounts',
                data: {}
            }
        ]);
        setTimeout(() => {
            if (trezor.status === Trezor_1.Status.INITIAL && !trezor.device) {
                // if the trezor hasn't connected in a reasonable amount of time, consider it disconnected
                trezor.status = Trezor_1.Status.DISCONNECTED;
                this.emit('update', trezor);
            }
        }, 10000);
        return trezor;
    }
    close() {
        if (this.observer) {
            this.observer.remove();
            this.observer = undefined;
        }
        bridge_1.default.close();
        super.close();
    }
    remove(trezor) {
        if (trezor.id in this.knownSigners) {
            electron_log_1.default.info(`removing Trezor ${trezor.id}`);
            delete this.knownSigners[trezor.id];
            trezor.close();
        }
    }
    reload(trezor) {
        electron_log_1.default.info(`reloading Trezor ${trezor.id}`);
        trezor.status = Trezor_1.Status.INITIAL;
        this.emit('update', trezor);
        if (trezor.device) {
            // this Trezor is already open, just reset and derive addresses again
            trezor.open(trezor.device).then(() => trezor.deriveAddresses());
        }
        else {
            // this Trezor is not open because it was never connected,
            // attempt to force a reload by calling this method
            bridge_1.default.getFeatures({ device: { path: trezor.path } });
        }
    }
    addEventHandler(signer, event, handler) {
        this.knownSigners[signer.id].eventHandlers[event] = handler;
    }
    handleEvent(signerId, event, ...args) {
        const action = this.knownSigners[signerId]?.eventHandlers[event] || (() => { });
        delete this.knownSigners[signerId].eventHandlers[event];
        action(args);
    }
    withSigner(device, fn) {
        const signer = this.knownSigners[Trezor_1.default.generateId(device.path)]?.signer;
        if (signer)
            fn(signer);
    }
}
exports.default = TrezorSignerAdapter;
