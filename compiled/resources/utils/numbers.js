"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDisplayDecimal = exports.isUnlimited = exports.formatNumber = exports.max = void 0;
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const constants_1 = require("../constants");
exports.max = (0, bignumber_js_1.default)(constants_1.MAX_HEX, 16);
const numberRegex = /\.0+$|(\.[0-9]*[1-9])0+$/;
const digitsLookup = [
    { value: 1, symbol: '' },
    { value: 1e6, symbol: 'million' },
    { value: 1e9, symbol: 'billion' },
    { value: 1e12, symbol: 'trillion' },
    { value: 1e15, symbol: 'quadrillion' },
    { value: 1e18, symbol: 'quintillion' }
];
function formatNumber(n, digits = 4) {
    const num = Number(n);
    const item = digitsLookup
        .slice()
        .reverse()
        .find((item) => num >= item.value) || { value: 0, symbol: '?' };
    const formatted = (value) => {
        const isAproximate = value.toFixed(digits) !== value.toString(10);
        const prefix = isAproximate ? '~' : '';
        return `${prefix}${value.toFixed(digits).replace(numberRegex, '$1')} ${item.symbol}`;
    };
    return item ? formatted(num / item.value) : '0';
}
exports.formatNumber = formatNumber;
function isUnlimited(amount) {
    return exports.max.eq(amount);
}
exports.isUnlimited = isUnlimited;
function formatDisplayDecimal(amount, decimals) {
    const bn = (0, bignumber_js_1.default)(amount).shiftedBy(-decimals);
    if (bn.gt(9e12))
        return decimals ? '~unlimited' : 'unknown';
    return formatNumber(bn.toNumber());
}
exports.formatDisplayDecimal = formatDisplayDecimal;
