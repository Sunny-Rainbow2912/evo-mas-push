"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toTokenId = exports.isNativeCurrency = exports.sortByTotalValue = exports.createBalance = exports.formatUsdRate = exports.formatBalance = void 0;
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const constants_1 = require("../../constants");
const UNKNOWN = '?';
function formatBalance(balance, totalValue, decimals = 8) {
    const isZero = balance.isZero();
    if (!isZero && balance.toNumber() < 0.001 && totalValue.toNumber() < 1)
        return '<0.001';
    return new Intl.NumberFormat('us-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8
    }).format(Number(balance.toFixed(decimals, bignumber_js_1.default.ROUND_FLOOR)));
}
exports.formatBalance = formatBalance;
function formatUsdRate(rate, decimals = 2) {
    return rate.isNaN()
        ? UNKNOWN
        : new Intl.NumberFormat('us-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(Number(rate.toFixed(decimals, bignumber_js_1.default.ROUND_FLOOR)));
}
exports.formatUsdRate = formatUsdRate;
function createBalance(rawBalance, quote) {
    const balance = (0, bignumber_js_1.default)(rawBalance.balance || 0).shiftedBy(-rawBalance.decimals);
    const usdRate = new bignumber_js_1.default((quote && quote.price) || NaN);
    const change24hr = new bignumber_js_1.default((quote && quote['change24hr']) || 0);
    const totalValue = balance.times(usdRate);
    const balanceDecimals = Math.max(2, usdRate.shiftedBy(1).toFixed(0, bignumber_js_1.default.ROUND_DOWN).length);
    return {
        ...rawBalance,
        usdRate: quote,
        displayBalance: formatBalance(balance, totalValue, balanceDecimals),
        price: formatUsdRate(usdRate),
        priceChange: !usdRate.isZero() && !usdRate.isNaN() && change24hr.toFixed(2),
        totalValue: totalValue.isNaN() ? (0, bignumber_js_1.default)(0) : totalValue,
        displayValue: totalValue.isZero() ? '0' : formatUsdRate(totalValue, 0)
    };
}
exports.createBalance = createBalance;
const sortByTotalValue = (a, b) => {
    const difference = b.totalValue.minus(a.totalValue);
    if (!difference.isZero()) {
        return difference;
    }
    const balanceA = (0, bignumber_js_1.default)(a.balance || 0).shiftedBy(-a.decimals);
    const balanceB = (0, bignumber_js_1.default)(b.balance || 0).shiftedBy(-b.decimals);
    return balanceB.minus(balanceA);
};
exports.sortByTotalValue = sortByTotalValue;
function isNativeCurrency(address) {
    return address === constants_1.NATIVE_CURRENCY;
}
exports.isNativeCurrency = isNativeCurrency;
function toTokenId(token) {
    const { chainId, address } = token;
    return `${chainId}:${address.toLowerCase()}`;
}
exports.toTokenId = toTokenId;
