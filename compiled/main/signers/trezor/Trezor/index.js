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
exports.Status = void 0;
const electron_log_1 = __importDefault(require("electron-log"));
const utils_1 = require("../../../../resources/utils");
const util_1 = require("@ethereumjs/util");
const eth_sig_util_1 = require("@metamask/eth-sig-util");
const uuid_1 = require("uuid");
const Signer_1 = __importDefault(require("../../Signer"));
const transaction_1 = require("../../../transaction");
const derive_1 = require("../../Signer/derive");
const bridge_1 = __importStar(require("../bridge"));
const ns = '3bbcee75-cecc-5b56-8031-b6641c1ed1f1';
const defaultTrezorTVersion = { major_version: 2, minor_version: 3, patch_version: 0 };
const defaultTrezorOneVersion = { major_version: 1, minor_version: 9, patch_version: 2 };
exports.Status = {
    INITIAL: 'Connecting',
    OK: 'ok',
    LOADING: 'loading',
    DERIVING: 'addresses',
    LOCKED: 'locked',
    DISCONNECTED: 'Disconnected',
    NEEDS_RECONNECTION: 'Please reconnect this Trezor device',
    NEEDS_PIN: 'Need Pin',
    NEEDS_PASSPHRASE: 'Enter Passphrase',
    ENTERING_PASSPHRASE: 'waiting for input on device'
};
function createError(message, code, cause = '') {
    // the cause may need to be transformed into a more informative message
    return cause.toLowerCase().match(/forbidden key path/)
        ? new bridge_1.DeviceError('derivation path failed strict safety checks on trezor device', 'SAFETY_CHECKS')
        : new bridge_1.DeviceError(message, code);
}
class Trezor extends Signer_1.default {
    constructor(path) {
        super();
        this.path = path;
        this.id = Trezor.generateId(path);
        this.type = 'trezor';
        this.status = exports.Status.INITIAL;
    }
    static generateId(path) {
        return (0, uuid_1.v5)('Trezor' + path, ns);
    }
    async open(device) {
        this.device = device;
        this.status = exports.Status.INITIAL;
        this.emit('update');
        try {
            const features = await bridge_1.default.getFeatures({ device });
            const defaultVersion = features?.model === 'T' ? defaultTrezorTVersion : defaultTrezorOneVersion;
            const { major_version: major, minor_version: minor, patch_version: patch } = features || defaultVersion;
            this.appVersion = { major, minor, patch };
            const model = (features?.model || '').toString() === '1' ? 'One' : features?.model;
            this.model = ['Trezor', model].join(' ').trim();
        }
        catch (e) {
            this.handleUnrecoverableError();
            throw e;
        }
        try {
            // this prompts a login of pin and/or passphrase
            await bridge_1.default.getAccountInfo(device, this.getPath(0));
        }
        catch (e) {
            const deviceError = createError(exports.Status.NEEDS_RECONNECTION, 'ACCOUNT_ACCESS_FAILURE', e.message);
            this.handleError(deviceError);
            throw e;
        }
    }
    close() {
        this.device = undefined;
        this.emit('close');
        this.removeAllListeners();
        super.close();
    }
    summary() {
        const summary = super.summary();
        return {
            ...summary,
            capabilities: this.device?.features?.capabilities || []
        };
    }
    getPath(index) {
        return this.basePath() + '/' + index.toString();
    }
    basePath() {
        if (!this.derivation) {
            throw new Error('attempted to get base path with unknown derivation!');
        }
        return `m/${(0, derive_1.getDerivationPath)(this.derivation)}`.replace(/\/+$/, '');
    }
    handleUnrecoverableError() {
        this.handleError(new bridge_1.DeviceError('Unrecoverable error', 'UNRECOVERABLE'));
    }
    handleError(error) {
        const errorStatusMap = {
            ADDRESS_NO_MATCH_DEVICE: exports.Status.NEEDS_RECONNECTION,
            UNRECOVERABLE: exports.Status.NEEDS_RECONNECTION,
            ADDRESS_VERIFICATION_FAILURE: exports.Status.NEEDS_RECONNECTION,
            ACCOUNT_ACCESS_FAILURE: exports.Status.NEEDS_RECONNECTION,
            SAFETY_CHECKS: 'derivation path failed strict safety checks on trezor device'
        };
        const newStatus = errorStatusMap[error.code];
        if (newStatus) {
            this.status = newStatus;
        }
        this.emit('update');
    }
    async verifyAddress(index, currentAddress = '', display = false, cb) {
        const waitForInput = setTimeout(() => {
            electron_log_1.default.error('Trezor address verification timed out');
            cb(new Error('Address verification timed out'));
        }, 60000);
        try {
            if (!this.device) {
                throw new Error('Trezor not connected');
            }
            const reportedAddress = await bridge_1.default.getAddress(this.device, this.getPath(index), display);
            clearTimeout(waitForInput);
            const current = currentAddress.toLowerCase();
            if (reportedAddress !== current) {
                electron_log_1.default.error(`address from EvoTradeWallet (${current}) does not match address from Trezor device (${reportedAddress})`);
                this.handleError(new bridge_1.DeviceError('address does not match device, reconnect your Trezor', 'ADDRESS_NO_MATCH_DEVICE'));
                cb(new Error('Address does not match device'), undefined);
            }
            else {
                electron_log_1.default.verbose('Trezor address matches device');
                cb(null, true);
            }
        }
        catch (e) {
            clearTimeout(waitForInput);
            const err = e;
            electron_log_1.default.error('error verifying Trezor address', err);
            const deviceError = createError('could not verify address, reconnect your Trezor', 'ADDRESS_VERIFICATION_FAILURE', err.message);
            this.handleError(deviceError);
            cb(new Error(err.message));
        }
    }
    async deriveAddresses() {
        this.status = exports.Status.DERIVING;
        this.emit('update');
        try {
            if (!this.device) {
                throw new Error('Trezor not connected');
            }
            const publicKey = await bridge_1.default.getPublicKey(this.device, this.basePath());
            this.deriveHDAccounts(publicKey.publicKey, publicKey.chainCode, (err, accounts = []) => {
                if (err) {
                    this.handleError(new bridge_1.DeviceError('could not derive addresses, reconnect your Trezor', 'DERIVATION_FAILURE'));
                    return;
                }
                const firstAccount = accounts[0] || '';
                this.verifyAddress(0, firstAccount, false, (err) => {
                    if (!err) {
                        this.status = exports.Status.OK;
                        this.addresses = accounts;
                    }
                    this.emit('update');
                });
            });
        }
        catch (e) {
            electron_log_1.default.error('could not get public key from Trezor', e);
            this.handleError(new bridge_1.DeviceError('could not derive addresses, reconnect your Trezor', 'DERIVATION_FAILURE'));
        }
    }
    async signMessage(index, rawMessage, cb) {
        try {
            if (!this.device) {
                throw new Error('Trezor is not connected');
            }
            const message = this.normalize(rawMessage);
            const signature = await bridge_1.default.signMessage(this.device, this.getPath(index), message);
            cb(null, (0, util_1.addHexPrefix)(signature));
        }
        catch (e) {
            const err = e;
            cb(new Error(err.message));
        }
    }
    async signTypedData(index, typedMessage, cb) {
        try {
            if (!this.device) {
                throw new Error('Trezor is not connected');
            }
            let signature;
            const path = this.getPath(index);
            if (this.isTrezorOne()) {
                // Trezor One requires hashed input
                const { types, primaryType, domain, message } = eth_sig_util_1.TypedDataUtils.sanitizeData(typedMessage.data);
                const domainSeparatorHash = eth_sig_util_1.TypedDataUtils.hashStruct('EIP712Domain', domain, types, eth_sig_util_1.SignTypedDataVersion.V4);
                const messageHash = eth_sig_util_1.TypedDataUtils.hashStruct(primaryType, message, types, eth_sig_util_1.SignTypedDataVersion.V4);
                signature = await bridge_1.default.signTypedHash(this.device, path, typedMessage.data, domainSeparatorHash.toString('hex'), messageHash.toString('hex'));
            }
            else {
                signature = await bridge_1.default.signTypedData(this.device, path, typedMessage.data);
            }
            cb(null, (0, util_1.addHexPrefix)(signature));
        }
        catch (e) {
            const err = e;
            cb(new Error(err.message));
        }
    }
    async signTransaction(index, rawTx, cb) {
        try {
            const compatibility = (0, transaction_1.signerCompatibility)(rawTx, this.summary());
            const compatibleTx = compatibility.compatible ? { ...rawTx } : (0, transaction_1.londonToLegacy)(rawTx);
            const signedTx = await (0, transaction_1.sign)(compatibleTx, async (tx) => {
                if (!this.device) {
                    throw new Error('Trezor is not connected');
                }
                const trezorTx = this.normalizeTransaction(rawTx.chainId, tx);
                const path = this.getPath(index);
                try {
                    return await bridge_1.default.signTransaction(this.device, path, trezorTx);
                }
                catch (e) {
                    const err = e;
                    const errMsg = err.message.toLowerCase().match(/forbidden key path/)
                        ? `Turn off strict Trezor safety checks in order to use the ${this.derivation} derivation path on this chain`
                        : err.message;
                    throw new Error(errMsg);
                }
            });
            cb(null, (0, util_1.addHexPrefix)(signedTx.serialize().toString('hex')));
        }
        catch (e) {
            const err = e;
            cb(err);
        }
    }
    isTrezorOne() {
        return this.model.toLowerCase().includes('one');
    }
    normalize(hex) {
        return (hex && (0, util_1.padToEven)((0, util_1.stripHexPrefix)(hex))) || '';
    }
    normalizeTransaction(chainId, tx) {
        const txJson = tx.toJSON();
        const unsignedTx = {
            nonce: this.normalize(txJson.nonce || ''),
            gasLimit: this.normalize(txJson.gasLimit || ''),
            to: this.normalize(txJson.to || ''),
            value: this.normalize(txJson.value || ''),
            data: this.normalize(txJson.data || ''),
            chainId: (0, utils_1.hexToInt)(chainId)
        };
        const optionalFields = ['gasPrice', 'maxFeePerGas', 'maxPriorityFeePerGas'];
        optionalFields.forEach((field) => {
            // @ts-ignore
            const val = txJson[field];
            if (val) {
                // @ts-ignore
                unsignedTx[field] = this.normalize(val);
            }
        });
        return unsignedTx;
    }
}
exports.default = Trezor;
