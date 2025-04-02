"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyTransaction = exports.londonToLegacy = exports.signerCompatibility = exports.sign = exports.populate = exports.maxFee = void 0;
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const util_1 = require("@ethereumjs/util");
const tx_1 = require("@ethereumjs/tx");
const transaction_1 = require("../../resources/domain/transaction");
const utils_1 = require("../../resources/utils");
const config_1 = __importDefault(require("../chains/config"));
const types_1 = require("../accounts/types");
const londonHardforkSigners = {
    seed: () => true,
    ring: () => true,
    ledger: (version) => version.major >= 2 || (version.major >= 1 && version.minor >= 9),
    trezor: (version, model) => {
        if ((model || '').toLowerCase() === 'trezor one') {
            return (version.major >= 2 ||
                (version.major >= 1 && (version.minor > 10 || (version.minor === 10 && version.patch >= 4))));
        }
        // 3.x+, 2.5.x+, or 2.4.2+
        return (version.major >= 3 ||
            (version.major === 2 && version.minor >= 5) ||
            (version.major === 2 && version.minor === 4 && version.patch >= 2));
    },
    lattice: (version) => version.major >= 1 || version.minor >= 11
};
function signerCompatibility(txData, signer) {
    if ((0, transaction_1.typeSupportsBaseFee)(txData.type)) {
        const compatible = signer.type in londonHardforkSigners &&
            londonHardforkSigners[signer.type](signer.appVersion, signer.model);
        return { signer: signer.type, tx: 'london', compatible };
    }
    return {
        signer: signer.type,
        tx: 'legacy',
        compatible: true
    };
}
exports.signerCompatibility = signerCompatibility;
function londonToLegacy(txData) {
    if (txData.type === '0x2') {
        const { type, maxFeePerGas, maxPriorityFeePerGas, ...tx } = txData;
        return { ...tx, type: '0x0', gasPrice: maxFeePerGas };
    }
    return txData;
}
exports.londonToLegacy = londonToLegacy;
function maxFee(rawTx) {
    const chainId = parseInt(rawTx.chainId);
    // for ETH-based chains, the max fee should be 2 ETH
    if ([1, 3, 4, 5, 6, 10, 42, 61, 62, 63, 69, 8453, 42161, 421611, 7777777].includes(chainId)) {
        return 2 * 1e18;
    }
    // for Fantom, the max fee should be 250 FTM
    if ([250, 4002].includes(chainId)) {
        return 250 * 1e18;
    }
    // for all other chains, default to 50 of the chain's currency
    return 50 * 1e18;
}
exports.maxFee = maxFee;
function calculateMaxFeePerGas(maxBaseFee, maxPriorityFee) {
    const maxFeePerGas = (0, bignumber_js_1.default)(maxPriorityFee).plus(maxBaseFee).toString(16);
    return (0, util_1.addHexPrefix)(maxFeePerGas);
}
function populate(rawTx, chainConfig, gas) {
    const txData = { ...rawTx };
    // non-EIP-1559 case
    if (!chainConfig.isActivatedEIP(1559) || !gas.price.fees) {
        txData.type = (0, util_1.intToHex)(chainConfig.isActivatedEIP(2930) ? 1 : 0);
        const useFrameGasPrice = !rawTx.gasPrice || isNaN(parseInt(rawTx.gasPrice, 16));
        if (useFrameGasPrice) {
            // no valid dapp-supplied value for gasPrice so we use the Frame-supplied value
            const gasPrice = (0, bignumber_js_1.default)(gas.price.levels.fast).toString(16);
            txData.gasPrice = (0, util_1.addHexPrefix)(gasPrice);
            txData.gasFeesSource = transaction_1.GasFeesSource.Frame;
        }
        return txData;
    }
    // EIP-1559 case
    txData.type = (0, util_1.intToHex)(2);
    const useFrameMaxFeePerGas = !rawTx.maxFeePerGas || isNaN(parseInt(rawTx.maxFeePerGas, 16));
    const useFrameMaxPriorityFeePerGas = !rawTx.maxPriorityFeePerGas || isNaN(parseInt(rawTx.maxPriorityFeePerGas, 16));
    if (!useFrameMaxFeePerGas && !useFrameMaxPriorityFeePerGas) {
        // return tx unaltered when we are using no Frame-supplied values
        return txData;
    }
    if (useFrameMaxFeePerGas && useFrameMaxPriorityFeePerGas) {
        // dapp did not supply a valid value for maxFeePerGas or maxPriorityFeePerGas so we change the source flag
        txData.gasFeesSource = transaction_1.GasFeesSource.Frame;
    }
    const maxPriorityFee = useFrameMaxPriorityFeePerGas && gas.price.fees.maxPriorityFeePerGas
        ? gas.price.fees.maxPriorityFeePerGas
        : rawTx.maxPriorityFeePerGas;
    // if no valid dapp-supplied value for maxFeePerGas we calculate it
    txData.maxFeePerGas =
        useFrameMaxFeePerGas && gas.price.fees.maxBaseFeePerGas
            ? calculateMaxFeePerGas(gas.price.fees.maxBaseFeePerGas, maxPriorityFee)
            : txData.maxFeePerGas;
    // if no valid dapp-supplied value for maxPriorityFeePerGas we use the Frame-supplied value
    txData.maxPriorityFeePerGas = useFrameMaxPriorityFeePerGas
        ? (0, util_1.addHexPrefix)((0, bignumber_js_1.default)(maxPriorityFee).toString(16))
        : txData.maxPriorityFeePerGas;
    return txData;
}
exports.populate = populate;
function hexifySignature({ v, r, s }) {
    return {
        v: (0, util_1.addHexPrefix)(v),
        r: (0, util_1.addHexPrefix)(r),
        s: (0, util_1.addHexPrefix)(s)
    };
}
async function sign(rawTx, signingFn) {
    const common = (0, config_1.default)(parseInt(rawTx.chainId, 16), parseInt(rawTx.type, 16) === 2 ? 'london' : 'berlin');
    const tx = tx_1.TransactionFactory.fromTxData(rawTx, { common });
    return signingFn(tx).then((sig) => {
        const signature = hexifySignature(sig);
        return tx_1.TransactionFactory.fromTxData({
            ...rawTx,
            ...signature
        }, { common });
    });
}
exports.sign = sign;
function classifyTransaction({ payload: { params }, recipientType }) {
    const { to, data = '0x' } = params[0];
    if (!to)
        return types_1.TxClassification.CONTRACT_DEPLOY;
    if (recipientType === 'external' && data.length > 2)
        return types_1.TxClassification.SEND_DATA;
    if ((0, utils_1.isNonZeroHex)(data) && recipientType !== 'external')
        return types_1.TxClassification.CONTRACT_CALL;
    return types_1.TxClassification.NATIVE_TRANSFER;
}
exports.classifyTransaction = classifyTransaction;
