"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceError = exports.Status = void 0;
const electron_log_1 = __importDefault(require("electron-log"));
const uuid_1 = require("uuid");
const hw_transport_node_hid_noevents_1 = __importDefault(require("@ledgerhq/hw-transport-node-hid-noevents"));
const requestQueue_1 = require("./requestQueue");
const Signer_1 = __importDefault(require("../../Signer"));
const eth_1 = __importDefault(require("./eth"));
const derive_1 = require("../../Signer/derive");
const transaction_1 = require("../../../transaction");
const ns = '3bbcee75-cecc-5b56-8031-b6641c1ed1f1';
exports.Status = {
    INITIAL: 'Connecting',
    OK: 'ok',
    LOADING: 'loading',
    DERIVING: 'addresses',
    LOCKED: 'locked',
    WRONG_APP: 'Open your Ledger and select the Ethereum application',
    DISCONNECTED: 'Disconnected',
    NEEDS_RECONNECTION: 'Please reconnect this Ledger device'
};
function wasRequestRejected(err) {
    return [27013].includes(err.statusCode);
}
function isInvalidRequest(err) {
    return [99901].includes(err.statusCode);
}
function isDeviceAsleep(err) {
    return [27404, 26628].includes(err.statusCode);
}
function needToOpenEthApp(err) {
    return [27904, 27906, 25873, 25871].includes(err.statusCode);
}
// additional status codes
//   27264: 'INCORRECT_DATA'
function getStatusForError(err) {
    if (needToOpenEthApp(err)) {
        return exports.Status.WRONG_APP;
    }
    if (isDeviceAsleep(err)) {
        return exports.Status.LOCKED;
    }
    if (wasRequestRejected(err) || isInvalidRequest(err)) {
        return exports.Status.OK;
    }
    return exports.Status.NEEDS_RECONNECTION;
}
class DeviceError extends Error {
    constructor(msg, code = -1) {
        super(msg);
        this.statusCode = code;
    }
}
exports.DeviceError = DeviceError;
class Ledger extends Signer_1.default {
    constructor(devicePath, model) {
        super();
        this.accountLimit = 5;
        // the Ledger device can only handle one request at a time; the transport will reject
        // all incoming requests while its busy, so we need to make sure requests are only executed
        // when the device is ready
        this.requestQueue = new requestQueue_1.RequestQueue();
        this.statusPoller = setTimeout(() => { });
        this.devicePath = devicePath;
        this.id = (0, uuid_1.v5)('Ledger' + this.devicePath, ns);
        this.type = 'ledger';
        this.model = model;
        this.status = exports.Status.INITIAL;
    }
    async open() {
        const transport = await hw_transport_node_hid_noevents_1.default.open(this.devicePath);
        this.eth = new eth_1.default(transport);
        this.requestQueue.start();
    }
    close() {
        this.emit('close');
        this.removeAllListeners();
        super.close();
    }
    async connect() {
        try {
            // since the Ledger doesn't provide information about whether the eth app is open or if
            // the device is locked, the order of these checks is important in order to correctly determine
            // the exact status based on the returned error codes
            //  1. getAppConfiguration
            //  2. checkDeviceStatus
            //  3. deriveAddresses
            const config = await this.getAppConfiguration();
            this.updateStatus(exports.Status.INITIAL);
            this.emit('update');
            // during connection is the only time we can access the device without
            // enqueuing the request, since no other requests should be active before
            // the device is connected
            await this.checkDeviceStatus();
            if (this.isReady()) {
                const [major, minor, patch] = (config.version || '1.6.1').split('.').map((n) => parseInt(n));
                const version = { major, minor, patch };
                this.appVersion = version;
                this.deriveAddresses();
            }
        }
        catch (err) {
            this.handleError(err);
            if (this.status !== exports.Status.LOCKED) {
                return this.disconnect();
            }
        }
    }
    async disconnect() {
        if (this.status === exports.Status.OK) {
            this.updateStatus(exports.Status.DISCONNECTED);
            this.emit('update');
        }
        this.requestQueue.close();
        clearTimeout(this.statusPoller);
        if (this.eth) {
            await this.eth.close();
            this.eth = undefined;
        }
    }
    isReady() {
        const readyStatuses = [exports.Status.INITIAL, exports.Status.OK];
        return readyStatuses.includes(this.status);
    }
    handleError(err) {
        const errorStatus = getStatusForError(err);
        if (errorStatus === exports.Status.LOCKED && this.status !== exports.Status.LOCKED) {
            this.updateStatus(exports.Status.LOCKED);
            return this.emit('lock');
        }
        if (errorStatus !== this.status) {
            this.updateStatus(errorStatus);
            this.emit('update');
            if (this.status === exports.Status.NEEDS_RECONNECTION) {
                this.disconnect();
            }
        }
    }
    isValidStatusTransition(status) {
        // TODO: outline all valid state transitions
        if (status === exports.Status.DERIVING) {
            return [exports.Status.OK, exports.Status.INITIAL].includes(this.status);
        }
        return true;
    }
    updateStatus(status) {
        if (this.isValidStatusTransition(status)) {
            this.status = status;
        }
        if (this.status === exports.Status.OK) {
            clearInterval(this.statusPoller);
            this.pollDeviceStatus(5000);
        }
        if (this.status === exports.Status.LOCKED) {
            clearInterval(this.statusPoller);
            this.pollDeviceStatus(500);
        }
    }
    async checkDeviceStatus() {
        const check = new Promise(async (resolve) => {
            setTimeout(() => {
                resolve(new DeviceError('status check timed out'));
            }, 3000);
            try {
                await this.eth?.getAddress("44'/60'/0'/0", false, false);
                resolve(undefined);
            }
            catch (e) {
                resolve(e);
            }
        });
        return check.then((err) => {
            if (!err) {
                // success, handle different status state transitions
                if (this.status === exports.Status.LOCKED) {
                    // when the app is unlocked, stop checking status since we will respond
                    // to the unlock event and start checking for status when that's complete
                    clearTimeout(this.statusPoller);
                    this.emit('unlock');
                }
            }
            else {
                this.handleError(err);
            }
            return err?.statusCode || 0;
        });
    }
    async pollDeviceStatus(frequency) {
        const lastStatus = this.status;
        this.statusPoller = setTimeout(() => {
            const lastRequest = this.requestQueue.peekBack();
            // prevent spamming eth app checks
            if (!lastRequest || lastRequest.type !== 'checkDeviceStatus') {
                this.enqueueRequests({
                    type: 'checkDeviceStatus',
                    execute: async () => {
                        if (lastStatus !== this.status) {
                            // check if the status changed since this event was enqueued, this
                            // will prevent unintended status transitions
                            return true;
                        }
                        return this.checkDeviceStatus();
                    }
                });
            }
            this.pollDeviceStatus(frequency);
        }, frequency);
    }
    enqueueRequests(...requests) {
        requests.forEach((req) => this.requestQueue.add(req));
    }
    getPath(index) {
        if (!this.derivation) {
            throw new Error('attempted to get path with unknown derivation!');
        }
        return (0, derive_1.getDerivationPath)(this.derivation, index);
    }
    // *** request enqueuing methods *** //
    deriveAddresses() {
        this.requestQueue.clear();
        this.addresses = [];
        this.updateStatus(exports.Status.DERIVING);
        this.emit('update');
        if (this.derivation === derive_1.Derivation.live) {
            this.deriveLiveAddresses();
        }
        else {
            this.deriveHardwareAddresses();
        }
    }
    deriveLiveAddresses() {
        const requests = [];
        for (let i = 0; i < this.accountLimit; i++) {
            requests.push({
                type: 'deriveAddresses',
                execute: async () => {
                    try {
                        if (!this.eth)
                            throw new Error('attempted to derive Live addresses but Eth app is not connected!');
                        const path = this.getPath(i);
                        const { address } = await this.eth.getAddress(path, false, false);
                        electron_log_1.default.verbose(`Found Ledger Live address #${i}: ${address}`);
                        if (this.derivation === derive_1.Derivation.live) {
                            // don't update if the derivation was changed while this request was running
                            if (this.status === exports.Status.DERIVING) {
                                this.updateStatus(exports.Status.OK);
                            }
                            this.addresses = [...this.addresses, address];
                            this.emit('update');
                        }
                    }
                    catch (e) {
                        this.handleError(e);
                    }
                }
            });
        }
        this.enqueueRequests(...requests);
    }
    deriveHardwareAddresses() {
        const targetDerivation = this.derivation;
        this.enqueueRequests({
            type: 'deriveAddresses',
            execute: async () => {
                try {
                    if (!this.eth)
                        throw new Error('attempted to derive hardware addresses but Eth app is not connected!');
                    if (!this.derivation)
                        throw new Error('attempted to derive hardware addresses for unknown derivation!');
                    const addresses = await this.eth.deriveAddresses(this.derivation);
                    if (this.derivation === targetDerivation) {
                        // don't update if the derivation was changed while this request was running
                        if (this.status === exports.Status.DERIVING) {
                            this.updateStatus(exports.Status.OK);
                        }
                        this.addresses = [...addresses];
                        this.emit('update');
                    }
                }
                catch (e) {
                    this.handleError(e);
                }
            }
        });
    }
    verifyAddress(index, currentAddress, display = false, cb) {
        this.enqueueRequests({
            type: 'verifyAddress',
            execute: async () => {
                try {
                    if (!this.eth)
                        throw new Error('attempted to verify address but Eth app is not connected!');
                    if (!this.derivation)
                        throw new Error('attempted to verify address with unknown derivation!');
                    const path = this.getPath(index);
                    const result = await this.getAddress(path, display, true);
                    const address = currentAddress.toLowerCase();
                    if (result.address.toLowerCase() !== address) {
                        const err = new Error('Address does not match device');
                        electron_log_1.default.error(err);
                        this.handleError(new DeviceError('failed to verify device address'));
                        return cb(err, undefined);
                    }
                    electron_log_1.default.info(`address ${address} matches device`);
                    cb(null, true);
                }
                catch (e) {
                    const err = e;
                    const message = wasRequestRejected(err) ? 'Verify request rejected by user' : 'Verify address error';
                    // if the address couldn't be verified for any reason the signer can no longer
                    // be used, so force it to be closed by setting the status code to unhandled error
                    this.handleError(new DeviceError(message));
                    electron_log_1.default.error('error verifying message on Ledger', err.toString());
                    cb(new Error(message), undefined);
                }
            }
        });
    }
    signMessage(index, message, cb) {
        this.enqueueRequests({
            type: 'signMessage',
            execute: async () => {
                try {
                    if (!this.eth)
                        throw new Error('attempted to sign message but Eth app is not connected!');
                    if (!this.derivation)
                        throw new Error('attempted to sign message with unknown derivation!');
                    const path = this.getPath(index);
                    const signedMessage = await this.eth.signMessage(path, message);
                    electron_log_1.default.info('successfully signed message on Ledger: ', message);
                    cb(null, signedMessage);
                }
                catch (e) {
                    const err = e;
                    const message = wasRequestRejected(err) ? 'Sign request rejected by user' : 'Sign message error';
                    this.handleError(err);
                    electron_log_1.default.error('error signing message on Ledger', err.toString());
                    cb(new Error(message), undefined);
                }
            }
        });
    }
    signTypedData(index, typedMessage, cb) {
        this.enqueueRequests({
            type: 'signTypedData',
            execute: async () => {
                try {
                    if (!this.eth)
                        throw new Error('attempted to sign typed data but Eth app is not connected!');
                    if (!this.derivation)
                        throw new Error('attempted to sign typed data with unknown derivation!');
                    const path = this.getPath(index);
                    const signedData = await this.eth.signTypedData(path, typedMessage.data);
                    electron_log_1.default.info('successfully signed typed data on Ledger: ', typedMessage.data);
                    cb(null, signedData);
                }
                catch (e) {
                    const err = e;
                    const message = wasRequestRejected(err)
                        ? 'Sign request rejected by user'
                        : `Sign message error: ${err.message}`;
                    this.handleError(err);
                    electron_log_1.default.error('error signing typed data on Ledger', message);
                    cb(new Error(message), undefined);
                }
            }
        });
    }
    signTransaction(index, rawTx, cb) {
        const compatibility = (0, transaction_1.signerCompatibility)(rawTx, this.summary());
        const ledgerTx = compatibility.compatible ? { ...rawTx } : (0, transaction_1.londonToLegacy)(rawTx);
        this.enqueueRequests({
            type: 'signTransaction',
            execute: async () => {
                try {
                    if (!this.eth)
                        throw new Error('attempted to sign transaction but Eth app is not connected!');
                    if (!this.derivation)
                        throw new Error('attempted to sign transaction with unknown derivation!');
                    const path = this.getPath(index);
                    const signedTx = await this.eth.signTransaction(path, ledgerTx);
                    electron_log_1.default.info('successfully signed transaction on Ledger: ', ledgerTx);
                    cb(null, signedTx);
                }
                catch (e) {
                    const err = e;
                    const message = wasRequestRejected(err) ? 'Sign request rejected by user' : 'Sign transaction error';
                    this.handleError(err);
                    electron_log_1.default.error('error signing transaction on Ledger', err.toString());
                    cb(new Error(message), undefined);
                }
            }
        });
    }
    // *** direct device access methods *** //
    async getAddress(path, display = false, chainCode = false) {
        return new Promise((resolve, reject) => {
            if (!this.eth) {
                return reject(new Error('tried to get address but Eth app is not connected!'));
            }
            let fallback = setTimeout(() => { });
            if (!display) {
                // if display is true, the Ledger waits for user input so never time out
                fallback = setTimeout(() => reject({ message: 'getAddress timed out', statusCode: -1 }), 3000);
            }
            this.eth
                .getAddress(path, display, chainCode)
                .then(resolve)
                .catch(reject)
                .finally(() => clearTimeout(fallback));
        });
    }
    async getAppConfiguration() {
        // if this call blocks and we are not yet connected it means that the Ledger is locked and
        // the eth app is not open; if the Ledger is locked and eth app IS open, this should return successfully
        return new Promise((resolve, reject) => {
            if (!this.eth) {
                return reject(new Error('tried to get app configuration but Eth app is not connected!'));
            }
            const fallback = setTimeout(() => {
                const statusCode = this.status === exports.Status.INITIAL ? 27904 : -1;
                reject({ message: 'getAppConfiguration timed out', statusCode });
            }, 1000);
            this.eth
                .getAppConfiguration()
                .then(resolve)
                .catch(reject)
                .finally(() => clearTimeout(fallback));
        });
    }
}
exports.default = Ledger;
