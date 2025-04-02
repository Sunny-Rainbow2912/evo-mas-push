"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Status = void 0;
const electron_log_1 = __importDefault(require("electron-log"));
const rlp_1 = require("rlp");
const gridplus_sdk_1 = require("gridplus-sdk");
const util_1 = require("@ethereumjs/util");
const Signer_1 = __importDefault(require("../../Signer"));
const transaction_1 = require("../../../transaction");
const derive_1 = require("../../Signer/derive");
const utils_1 = require("../../../../resources/utils");
const ADDRESS_LIMIT = 10;
const HARDENED_OFFSET = 0x80000000;
exports.Status = {
    OK: 'ok',
    CONNECTING: 'connecting',
    DERIVING: 'addresses',
    READY_FOR_PAIRING: 'pair',
    LOCKED: 'locked',
    PAIRING: 'Pairing',
    PAIRING_FAILED: 'Pairing Failed',
    UNKNOWN_ERROR: 'Unknown Device Error',
    DISCONNECTED: 'disconnected',
    NEEDS_RECONNECTION: 'Please reload this Lattice1 device'
};
function devicePermission(tag) {
    return tag ? `Frame-${tag}` : 'Frame';
}
function parseError(err) {
    return (err.message || '').replace(/Error from device: /, '');
}
function getStatusForError(err) {
    const errText = (err.message || '').toLowerCase();
    if (errText.includes('device locked')) {
        return exports.Status.LOCKED;
    }
    if (errText.includes('pairing failed')) {
        return exports.Status.PAIRING_FAILED;
    }
    return exports.Status.UNKNOWN_ERROR;
}
class Lattice extends Signer_1.default {
    constructor(deviceId, name, tag) {
        super();
        this.connection = null;
        this.accountLimit = 5;
        this.tag = '';
        this.id = 'lattice-' + deviceId;
        this.deviceId = deviceId;
        this.name = name;
        this.tag = tag;
        this.status = exports.Status.DISCONNECTED;
        this.type = 'lattice';
        this.model = 'Lattice1';
    }
    async connect(baseUrl, privateKey) {
        this.status = exports.Status.CONNECTING;
        this.emit('update');
        electron_log_1.default.info('connecting to Lattice', { name: this.name, baseUrl });
        this.connection = new gridplus_sdk_1.Client({
            name: devicePermission(this.tag),
            baseUrl,
            privKey: privateKey
        });
        try {
            const paired = await this.connection.connect(this.deviceId);
            const { fix: patch, minor, major } = this.connection.getFwVersion() || { fix: 0, major: 0, minor: 0 };
            electron_log_1.default.info(`Connected to Lattice with deviceId=${this.deviceId} paired=${paired}, firmware v${major}.${minor}.${patch}`);
            this.appVersion = { major, minor, patch };
            if (!paired) {
                this.status = exports.Status.READY_FOR_PAIRING;
                this.emit('update');
            }
            this.emit('connect', paired);
            return paired;
        }
        catch (e) {
            const errorMessage = this.handleError('could not connect to Lattice', e);
            this.emit('error');
            throw new Error(errorMessage);
        }
    }
    disconnect() {
        if (this.status === exports.Status.OK) {
            this.status = exports.Status.DISCONNECTED;
            this.emit('update');
        }
        this.connection = null;
        this.addresses = [];
    }
    close() {
        this.emit('close');
        this.removeAllListeners();
        this.disconnect();
        super.close();
    }
    async pair(pairingCode) {
        electron_log_1.default.info(`pairing to Lattice ${this.deviceId} with code`, pairingCode);
        this.status = exports.Status.PAIRING;
        this.emit('update');
        try {
            const connection = this.connection;
            const hasActiveWallet = await connection.pair(pairingCode);
            electron_log_1.default.info(`successfully paired to Lattice ${this.deviceId}`);
            this.emit('paired', hasActiveWallet);
            return hasActiveWallet;
        }
        catch (e) {
            const errorMessage = this.handleError('could not pair to Lattice', e);
            this.emit('error');
            throw new Error(errorMessage);
        }
    }
    async deriveAddresses(derivation, retries = 2) {
        this.status = exports.Status.DERIVING;
        this.emit('update');
        electron_log_1.default.info(`deriving addresses for Lattice ${this.connection.getAppName()}`);
        try {
            await this.derive({ derivation, retries });
        }
        catch (e) {
            this.emit('error', e);
        }
    }
    async derive(opts) {
        const { derivation, retries } = opts;
        try {
            this.derivation = derivation || this.derivation;
            const connection = this.connection;
            const addressLimit = this.derivation === derive_1.Derivation.live ? 1 : ADDRESS_LIMIT;
            while (this.addresses.length < this.accountLimit) {
                const req = {
                    startPath: this.getPath(this.addresses.length),
                    n: Math.min(addressLimit, this.accountLimit - this.addresses.length)
                };
                const loadedAddresses = await connection.getAddresses(req);
                this.addresses = [...this.addresses, ...loadedAddresses].map((addr) => (0, util_1.addHexPrefix)(addr.toString()));
            }
            this.status = 'ok';
            this.emit('update');
            return this.addresses;
        }
        catch (e) {
            const err = e;
            if (retries > 0) {
                electron_log_1.default.verbose(`Deriving ${this.derivation} Lattice addresses failed, trying ${retries} more times, error:`, err.message);
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(this.derive({ ...opts, retries: retries - 1 }));
                    }, 3000);
                });
            }
            const errorMessage = this.handleError('could not derive addresses', err);
            throw new Error(errorMessage);
        }
    }
    async verifyAddress(index, currentAddress, display = true, cb) {
        const connection = this.connection;
        electron_log_1.default.info(`verifying address ${currentAddress} for Lattice ${connection.getAppName()}`);
        try {
            const addresses = await this.derive({ retries: 0 });
            const address = (addresses[index] || '').toLowerCase();
            if (address !== currentAddress) {
                throw new Error('Address does not match device');
            }
            electron_log_1.default.info(`address ${currentAddress} matches device`);
            cb(null, true);
        }
        catch (e) {
            const err = e;
            this.handleError('could not verify address', err);
            this.emit('error');
            cb(err.message === 'Address does not match device' ? err : new Error('Verify Address Error'));
        }
    }
    async signMessage(index, message, cb) {
        try {
            const signature = await this.sign(index, 'signPersonal', message);
            return cb(null, signature);
        }
        catch (err) {
            electron_log_1.default.error('failed to sign message with Lattice', err);
            const latticeErrorMessage = err.errorMessage;
            return cb(new Error(latticeErrorMessage));
        }
    }
    async signTypedData(index, typedMessage, cb) {
        try {
            const signature = await this.sign(index, 'eip712', typedMessage.data);
            return cb(null, signature);
        }
        catch (err) {
            electron_log_1.default.error('failed to sign typed data with Lattice', err);
            const latticeErrorMessage = err.errorMessage;
            return cb(new Error(latticeErrorMessage));
        }
    }
    async signTransaction(index, rawTx, cb) {
        try {
            const connection = this.connection;
            const compatibility = (0, transaction_1.signerCompatibility)(rawTx, this.summary());
            const latticeTx = compatibility.compatible ? { ...rawTx } : (0, transaction_1.londonToLegacy)(rawTx);
            const signedTx = await (0, transaction_1.sign)(latticeTx, async (tx) => {
                const unsignedTx = this.createTransaction(index, rawTx.type, latticeTx.chainId, tx);
                const signingOptions = await this.createTransactionSigningOptions(tx, unsignedTx);
                const signedTx = await connection.sign(signingOptions);
                const sig = signedTx?.sig;
                return {
                    v: sig.v.toString('hex'),
                    r: sig.r.toString('hex'),
                    s: sig.s.toString('hex')
                };
            });
            cb(null, (0, util_1.addHexPrefix)(signedTx.serialize().toString('hex')));
        }
        catch (err) {
            electron_log_1.default.error('error signing transaction with Lattice', err);
            const latticeErrorMessage = err.errorMessage;
            return cb(new Error(latticeErrorMessage));
        }
    }
    summary() {
        const summary = super.summary();
        return {
            ...summary,
            tag: this.tag,
            addresses: this.addresses.slice(0, this.accountLimit || this.addresses.length)
        };
    }
    async sign(index, protocol, payload) {
        const connection = this.connection;
        const data = {
            protocol,
            payload,
            curveType: gridplus_sdk_1.Constants.SIGNING.CURVES.SECP256K1,
            hashType: gridplus_sdk_1.Constants.SIGNING.HASHES.KECCAK256,
            signerPath: this.getPath(index)
        };
        const signOpts = {
            currency: 'ETH_MSG',
            data: data
        };
        const result = await connection.sign(signOpts);
        const sig = result?.sig;
        const signature = [sig.r, sig.s, (0, util_1.padToEven)(sig.v.toString('hex'))].join('');
        return (0, util_1.addHexPrefix)(signature);
    }
    createTransaction(index, txType, chainId, tx) {
        const { value, to, data, ...txJson } = tx.toJSON();
        const type = (0, utils_1.hexToInt)(txType);
        const unsignedTx = {
            to,
            value,
            data,
            chainId,
            nonce: (0, utils_1.hexToInt)(txJson.nonce || ''),
            gasLimit: (0, utils_1.hexToInt)(txJson.gasLimit || ''),
            useEIP155: true,
            signerPath: this.getPath(index)
        };
        if (type) {
            unsignedTx.type = type;
        }
        const optionalFields = ['gasPrice', 'maxFeePerGas', 'maxPriorityFeePerGas'];
        optionalFields.forEach((field) => {
            if (field in txJson) {
                // @ts-ignore
                unsignedTx[field] = (0, utils_1.hexToInt)(txJson[field]);
            }
        });
        return unsignedTx;
    }
    async createTransactionSigningOptions(tx, unsignedTx) {
        const fwVersion = this.connection.getFwVersion();
        if (fwVersion && (fwVersion.major > 0 || fwVersion.minor >= 15)) {
            const payload = tx.type ? tx.getMessageToSign(false) : (0, rlp_1.encode)(tx.getMessageToSign(false));
            const to = tx.to?.toString() ?? undefined;
            const callDataDecoder = to
                ? await gridplus_sdk_1.Utils.fetchCalldataDecoder(tx.data, to, unsignedTx.chainId)
                : undefined;
            const data = {
                payload,
                curveType: gridplus_sdk_1.Constants.SIGNING.CURVES.SECP256K1,
                hashType: gridplus_sdk_1.Constants.SIGNING.HASHES.KECCAK256,
                encodingType: gridplus_sdk_1.Constants.SIGNING.ENCODINGS.EVM,
                signerPath: unsignedTx.signerPath,
                decoder: callDataDecoder?.def
            };
            return { data, currency: unsignedTx.currency };
        }
        return { currency: 'ETH', data: unsignedTx };
    }
    getPath(index) {
        if (!this.derivation) {
            throw new Error('attempted to get base path with unknown derivation!');
        }
        const path = (0, derive_1.getDerivationPath)(this.derivation, index);
        return path.split('/').map((element) => {
            if (element.endsWith("'")) {
                return parseInt(element.substring(0, element.length - 1)) + HARDENED_OFFSET;
            }
            return parseInt(element);
        });
    }
    handleError(message, err) {
        const status = getStatusForError(err);
        const parsedErrorMessage = parseError(err);
        const fullMessage = message + ': ' + parsedErrorMessage;
        electron_log_1.default.error(fullMessage);
        this.status = status;
        return fullMessage;
    }
}
exports.default = Lattice;
