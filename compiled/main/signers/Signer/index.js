"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_log_1 = __importDefault(require("electron-log"));
const stream_1 = __importDefault(require("stream"));
const util_1 = require("@ethereumjs/util");
const derive_1 = require("./derive");
const crypt_1 = __importDefault(require("../../crypt"));
const signer_1 = require("../../../resources/domain/signer");
class Signer extends stream_1.default {
    constructor() {
        super();
        this.id = '';
        this.type = '';
        this.name = '';
        this.status = '';
        this.coinbase = '0x';
        this.model = '';
        this.appVersion = { major: 0, minor: 0, patch: 0 };
        this.addresses = [];
    }
    deriveHDAccounts(publicKey, chainCode, cb) {
        (0, derive_1.deriveHDAccounts)(publicKey, chainCode, cb);
    }
    fingerprint() {
        if (this.addresses && this.addresses.length)
            return crypt_1.default.stringToKey(this.addresses.join()).toString('hex');
    }
    getCoinbase(cb) {
        cb(null, this.addresses[0].toString());
    }
    verifyAddress(index, current, display, cb) {
        const err = new Error('Signer:' + this.type + ' did not implement verifyAddress method');
        electron_log_1.default.error(err);
        cb(err, undefined);
    }
    summary() {
        return {
            id: this.id,
            name: this.name || `${(0, signer_1.getSignerDisplayType)(this)} signer`,
            type: this.type,
            model: this.model,
            addresses: this.addresses.map((addr) => (0, util_1.addHexPrefix)(addr.toString())),
            status: this.status,
            appVersion: this.appVersion || { major: 0, minor: 0, patch: 0 }
        };
    }
    open(device) {
        electron_log_1.default.warn(`Signer: ${this.type} did not implement an open method`);
    }
    close() {
        electron_log_1.default.warn(`Signer: ${this.type} did not implement a close method`);
    }
    delete() {
        electron_log_1.default.warn(`Signer: ${this.type} did not implement a delete method`);
    }
    update(options = {}) {
        electron_log_1.default.warn(`Signer: ${this.type} did not implement an update method`);
    }
    signMessage(index, message, cb) {
        electron_log_1.default.warn(`Signer: ${this.type} did not implement a signMessage method`);
    }
    signTransaction(index, rawTx, cb) {
        electron_log_1.default.warn(`Signer: ${this.type} did not implement a signTransaction method`);
    }
    signTypedData(index, typedMessage, cb) {
        return cb(new Error(`Signer: ${this.type} does not support eth_signTypedData`), undefined);
    }
}
exports.default = Signer;
