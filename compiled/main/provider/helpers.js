"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ecRecover = exports.getActiveChainDetails = exports.getActiveChainsFull = exports.requestPermissions = exports.getPermissions = exports.getSignedAddress = exports.resError = exports.gasFees = exports.getRawTx = exports.feeTotalOverMax = exports.checkExistingNonceGas = exports.decodeMessage = void 0;
const util_1 = require("@ethereumjs/util");
const electron_log_1 = __importDefault(require("electron-log"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const isutf8_1 = __importDefault(require("isutf8"));
const utils_1 = require("ethers/lib/utils");
const store_1 = __importDefault(require("../store"));
const protectedMethods_1 = __importDefault(require("../api/protectedMethods"));
const transaction_1 = require("../../resources/domain/transaction");
const utils_2 = require("../../resources/utils");
const permission = (date, method) => ({ parentCapability: method, date });
function decodeMessage(rawMessage) {
    if ((0, utils_1.isHexString)(rawMessage)) {
        const buff = Buffer.from((0, util_1.stripHexPrefix)(rawMessage), 'hex');
        return buff.length === 32 || !(0, isutf8_1.default)(buff) ? rawMessage : buff.toString('utf8');
    }
    // replace all multiple line returns with just one to prevent excess space in message
    return rawMessage.replaceAll(/[\n\r]+/g, '\n');
}
exports.decodeMessage = decodeMessage;
function checkExistingNonceGas(tx) {
    const { from, nonce } = tx;
    const reqs = (0, store_1.default)('main.accounts', (from || '').toLowerCase(), 'requests');
    const requests = Object.keys(reqs || {}).map((key) => reqs[key]);
    const existing = requests.filter((r) => r.mode === 'monitor' && r.status !== 'error' && r.data.nonce === nonce);
    if (existing.length > 0) {
        if (tx.maxPriorityFeePerGas && tx.maxFeePerGas) {
            const existingFee = Math.max(...existing.map((r) => r.data.maxPriorityFeePerGas));
            const existingMax = Math.max(...existing.map((r) => r.data.maxFeePerGas));
            const feeInt = parseInt(tx.maxPriorityFeePerGas);
            const maxInt = parseInt(tx.maxFeePerGas);
            if (existingFee * 1.1 >= feeInt || existingMax * 1.1 >= maxInt) {
                // Bump fees by 10%
                const bumpedFee = Math.max(Math.ceil(existingFee * 1.1), feeInt);
                const bumpedBase = Math.max(Math.ceil((existingMax - existingFee) * 1.1), Math.ceil(maxInt - feeInt));
                tx.maxFeePerGas = '0x' + (bumpedBase + bumpedFee).toString(16);
                tx.maxPriorityFeePerGas = '0x' + bumpedFee.toString(16);
                tx.gasFeesSource = transaction_1.GasFeesSource.Frame;
                tx.feesUpdated = true;
            }
        }
        else if (tx.gasPrice) {
            const existingPrice = Math.max(...existing.map((r) => r.data.gasPrice));
            const priceInt = parseInt(tx.gasPrice);
            if (existingPrice >= priceInt) {
                // Bump price by 10%
                const bumpedPrice = Math.ceil(existingPrice * 1.1);
                tx.gasPrice = '0x' + bumpedPrice.toString(16);
                tx.gasFeesSource = transaction_1.GasFeesSource.Frame;
                tx.feesUpdated = true;
            }
        }
    }
    return tx;
}
exports.checkExistingNonceGas = checkExistingNonceGas;
function feeTotalOverMax(rawTx, maxTotalFee) {
    const maxFeePerGas = (0, transaction_1.usesBaseFee)(rawTx)
        ? parseInt(rawTx.maxFeePerGas || '', 16)
        : parseInt(rawTx.gasPrice || '', 16);
    const gasLimit = parseInt(rawTx.gasLimit || '', 16);
    const totalFee = maxFeePerGas * gasLimit;
    return totalFee > maxTotalFee;
}
exports.feeTotalOverMax = feeTotalOverMax;
function parseValue(value = '') {
    const parsedHex = parseInt(value, 16);
    return (!!parsedHex && (0, util_1.addHexPrefix)((0, util_1.unpadHexString)(value))) || '0x0';
}
function getRawTx(newTx) {
    const { gas, gasLimit, data, value, type, from, to, ...rawTx } = newTx;
    const getNonce = () => {
        // pass through hex string or undefined
        if (rawTx.nonce === undefined || (0, utils_1.isHexString)(rawTx.nonce)) {
            return rawTx.nonce;
        }
        // convert positive integer strings to hex, reject everything else
        const nonceBN = new bignumber_js_1.default(rawTx.nonce);
        if (nonceBN.isNaN() || !nonceBN.isInteger() || nonceBN.isNegative()) {
            throw new Error('Invalid nonce');
        }
        return (0, util_1.addHexPrefix)(nonceBN.toString(16));
    };
    const tx = {
        ...rawTx,
        ...(from && { from: (0, utils_2.getAddress)(from) }),
        ...(to && { to: (0, utils_2.getAddress)(to) }),
        type: '0x0',
        value: parseValue(value),
        data: (0, util_1.addHexPrefix)((0, util_1.padToEven)((0, util_1.stripHexPrefix)(data || '0x'))),
        gasLimit: gasLimit || gas,
        chainId: rawTx.chainId,
        nonce: getNonce(),
        gasFeesSource: transaction_1.GasFeesSource.Dapp
    };
    return tx;
}
exports.getRawTx = getRawTx;
function gasFees(rawTx) {
    return (0, store_1.default)('main.networksMeta', 'ethereum', parseInt(rawTx.chainId, 16), 'gas');
}
exports.gasFees = gasFees;
function resError(errorData, request, res) {
    const error = typeof errorData === 'string'
        ? { message: errorData, code: -1 }
        : { message: errorData.message, code: errorData.code || -1 };
    electron_log_1.default.warn(error);
    res({ id: request.id, jsonrpc: request.jsonrpc, error });
}
exports.resError = resError;
function getSignedAddress(signed, message, cb) {
    const signature = Buffer.from((signed || '').replace('0x', ''), 'hex');
    if (signature.length !== 65)
        return cb(new Error('EvoTradeWallet verifySignature: Signature has incorrect length'));
    let v = signature[64];
    v = v === 0 || v === 1 ? v + 27 : v;
    const r = (0, util_1.toBuffer)(signature.slice(0, 32));
    const s = (0, util_1.toBuffer)(signature.slice(32, 64));
    const hash = (0, util_1.hashPersonalMessage)((0, util_1.toBuffer)(message));
    const verifiedAddress = '0x' + (0, util_1.pubToAddress)((0, util_1.ecrecover)(hash, BigInt(v), r, s)).toString('hex');
    cb(null, verifiedAddress);
}
exports.getSignedAddress = getSignedAddress;
function getPermissions(payload, res) {
    const now = new Date().getTime();
    const toPermission = permission.bind(null, now);
    const allowedOperations = protectedMethods_1.default.map(toPermission);
    res({ id: payload.id, jsonrpc: '2.0', result: allowedOperations });
}
exports.getPermissions = getPermissions;
function requestPermissions(payload, res) {
    // we already require the user to grant permission to call this method so
    // we just need to return permission objects for the requested operations
    const now = new Date().getTime();
    const requestedOperations = (payload.params || []).map((param) => permission(now, Object.keys(param)[0]));
    res({ id: payload.id, jsonrpc: '2.0', result: requestedOperations });
}
exports.requestPermissions = requestPermissions;
function getActiveChainsFull() {
    const chains = (0, store_1.default)('main.networks.ethereum') || {};
    // TODO: Finalize this spec
    return Object.values(chains)
        .filter((chain) => chain.on)
        .sort((a, b) => a.id - b.id)
        .map((chain) => {
        return {
            chainId: (0, util_1.intToHex)(chain.id),
            name: chain.name,
            network: '',
            nativeCurrency: {
                name: 'Ether',
                symbol: 'ETH',
                decimals: 18
            },
            shortName: '',
            icon: ''
        };
    });
}
exports.getActiveChainsFull = getActiveChainsFull;
function getActiveChainDetails() {
    const chains = (0, store_1.default)('main.networks.ethereum') || {};
    return Object.values(chains)
        .filter((chain) => chain.on)
        .sort((a, b) => a.id - b.id)
        .map((chain) => {
        return {
            id: (0, util_1.intToHex)(chain.id),
            name: chain.name
        };
    });
}
exports.getActiveChainDetails = getActiveChainDetails;
function ecRecover(payload, res) {
    const [message, signed] = payload.params;
    getSignedAddress(signed, message, (err, verifiedAddress) => {
        if (err)
            return resError(err.message, payload, res);
        res({ id: payload.id, jsonrpc: payload.jsonrpc, result: verifiedAddress });
    });
}
exports.ecRecover = ecRecover;
