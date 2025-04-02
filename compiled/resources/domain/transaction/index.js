"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeChainId = exports.usesBaseFee = exports.typeSupportsBaseFee = exports.GasFeesSource = void 0;
const util_1 = require("@ethereumjs/util");
var GasFeesSource;
(function (GasFeesSource) {
    GasFeesSource["Dapp"] = "Dapp";
    GasFeesSource["Frame"] = "Frame";
})(GasFeesSource = exports.GasFeesSource || (exports.GasFeesSource = {}));
function typeSupportsBaseFee(type) {
    return parseInt(type || '0') === 2;
}
exports.typeSupportsBaseFee = typeSupportsBaseFee;
function usesBaseFee(rawTx) {
    return typeSupportsBaseFee(rawTx.type);
}
exports.usesBaseFee = usesBaseFee;
function parseChainId(chainId) {
    if ((0, util_1.isHexString)(chainId)) {
        return parseInt(chainId, 16);
    }
    return Number(chainId);
}
// TODO: move this into requests parsing module
function normalizeChainId(tx, targetChain) {
    if (!tx.chainId)
        return tx;
    const chainId = parseChainId(tx.chainId);
    if (!chainId) {
        throw new Error(`Chain for transaction (${tx.chainId}) is not a hex-prefixed string`);
    }
    if (targetChain && targetChain !== chainId) {
        throw new Error(`Chain for transaction (${tx.chainId}) does not match request target chain (${targetChain})`);
    }
    return {
        ...tx,
        chainId: (0, util_1.addHexPrefix)(chainId.toString(16))
    };
}
exports.normalizeChainId = normalizeChainId;
