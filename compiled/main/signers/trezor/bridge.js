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
exports.DeviceError = void 0;
const electron_log_1 = __importDefault(require("electron-log"));
const events_1 = require("events");
const connect_1 = __importStar(require("@trezor/connect"));
class DeviceError extends Error {
    constructor(msg, code) {
        super(msg);
        this.code = code;
    }
}
exports.DeviceError = DeviceError;
const manifest = { email: 'info@evotrade.io', appUrl: 'https://evotrade.io' };
const config = {
    manifest,
    popup: false,
    webusb: false,
    debug: false,
    lazyLoad: false,
    transports: ['NodeUsbTransport']
};
async function handleResponse(p) {
    const response = await p;
    if (response.success)
        return response.payload;
    const responseError = new Error(response.payload.error);
    responseError.code = response.payload.code;
    throw responseError;
}
class TrezorBridge extends events_1.EventEmitter {
    async open() {
        connect_1.default.on(connect_1.DEVICE_EVENT, this.handleDeviceEvent.bind(this));
        connect_1.default.on(connect_1.UI_EVENT, this.handleUiEvent.bind(this));
        try {
            await connect_1.default.init(config);
            electron_log_1.default.info('Trezor Connect initialized');
            this.emit('connect');
        }
        catch (e) {
            electron_log_1.default.error('could not open TrezorConnect!', e);
        }
    }
    close() {
        this.removeAllListeners();
        connect_1.default.removeAllListeners();
        connect_1.default.dispose();
    }
    // methods to send requests from the application to a Trezor device
    async getFeatures(params) {
        return this.makeRequest(() => connect_1.default.getFeatures(params));
    }
    async getAccountInfo(device, path) {
        return this.makeRequest(() => connect_1.default.getAccountInfo({ device, path, coin: 'eth' }));
    }
    async getPublicKey(device, path) {
        return this.makeRequest(() => connect_1.default.getPublicKey({ device, path }));
    }
    async getAddress(device, path, display = false) {
        const result = await this.makeRequest(() => connect_1.default.ethereumGetAddress({
            device,
            path,
            showOnTrezor: display
        }));
        return (result.address || '').toLowerCase();
    }
    async signMessage(device, path, message) {
        const result = await this.makeRequest(() => connect_1.default.ethereumSignMessage({
            device,
            path,
            message,
            hex: true
        }));
        return result.signature;
    }
    async signTypedData(device, path, data) {
        const result = await this.makeRequest(() => connect_1.default.ethereumSignTypedData({
            device,
            path,
            data,
            metamask_v4_compat: true
        }));
        return result.signature;
    }
    async signTypedHash(device, path, data, domainSeparatorHash, messageHash) {
        const result = await this.makeRequest(() => connect_1.default.ethereumSignTypedData({
            device,
            path,
            data,
            domain_separator_hash: domainSeparatorHash,
            message_hash: messageHash,
            metamask_v4_compat: true
        }));
        return result.signature;
    }
    async signTransaction(device, path, tx) {
        const result = await this.makeRequest(() => connect_1.default.ethereumSignTransaction({
            device,
            path,
            transaction: tx
        }));
        const { v, r, s } = result;
        return { v, r, s };
    }
    pinEntered(deviceId, pin) {
        electron_log_1.default.debug('pin entered for device', deviceId);
        connect_1.default.uiResponse({ type: connect_1.UI.RECEIVE_PIN, payload: pin });
        this.emit('trezor:entered:pin', deviceId);
    }
    passphraseEntered(deviceId, phrase) {
        electron_log_1.default.debug('passphrase entered for device', deviceId);
        connect_1.default.uiResponse({ type: connect_1.UI.RECEIVE_PASSPHRASE, payload: { save: true, value: phrase } });
        this.emit('trezor:entered:passphrase', deviceId);
    }
    enterPassphraseOnDevice(deviceId) {
        electron_log_1.default.debug('requested to enter passphrase on device', deviceId);
        connect_1.default.uiResponse({
            type: connect_1.UI.RECEIVE_PASSPHRASE,
            payload: { value: '', passphraseOnDevice: true, save: true }
        });
        this.emit('trezor:enteringPhrase', deviceId);
    }
    async makeRequest(fn, retries = 20) {
        try {
            const result = await handleResponse(fn());
            return result;
        }
        catch (e) {
            if (retries === 0) {
                throw new Error('Trezor unreachable, please try again');
            }
            const err = e;
            if (err.code === 'Device_CallInProgress') {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        electron_log_1.default.warn('request conflict, trying again in 400ms', err);
                        resolve(this.makeRequest(fn, retries - 1));
                    }, 400);
                });
            }
            else {
                throw err;
            }
        }
    }
    // listeners for events coming from a Trezor device
    handleDeviceEvent(e) {
        electron_log_1.default.debug('received Trezor device event', { e });
        if ((e.type === connect_1.DEVICE.CHANGED || e.type === connect_1.DEVICE.CONNECT_UNACQUIRED) &&
            e.payload.type === 'unacquired') {
            // device is detected but not connected, either because
            // another session is already active or that the connection
            // has just not been made yet
            this.emit('trezor:detected', e.payload.path);
        }
        else if (e.type === connect_1.DEVICE.CONNECT && e.payload.type === 'acquired') {
            this.emit('trezor:connect', e.payload);
        }
        else if (e.type === connect_1.DEVICE.DISCONNECT) {
            this.emit('trezor:disconnect', e.payload);
        }
        else if (e.type === connect_1.DEVICE.CHANGED) {
            // update the device to remember things like passphrases and other session info
            this.emit('trezor:update', e.payload);
        }
    }
    handleUiEvent(e) {
        electron_log_1.default.debug('received Trezor ui event', { e });
        if (e.type === connect_1.UI.REQUEST_PIN) {
            this.emit('trezor:needPin', e.payload.device);
        }
        else if (e.type === connect_1.UI.REQUEST_PASSPHRASE) {
            this.emit('trezor:needPhrase', e.payload.device);
        }
    }
}
exports.default = new TrezorBridge();
