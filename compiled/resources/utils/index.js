"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNonZeroHex = exports.matchFilter = exports.stripHexPrefix = exports.getAddress = exports.roundGwei = exports.gweiToWeiHex = exports.weiIntToEthInt = exports.weiHexToGweiInt = exports.hexToInt = exports.intToHex = exports.gweiToHex = exports.gweiToWei = exports.weiToHex = exports.weiToGwei = exports.debounce = exports.arraysMatch = exports.arraysEqual = exports.capitalize = exports.randomLetters = exports.getErrorCode = void 0;
const crypto_1 = require("crypto");
const util_1 = require("@ethereumjs/util");
Object.defineProperty(exports, "intToHex", { enumerable: true, get: function () { return util_1.intToHex; } });
Object.defineProperty(exports, "stripHexPrefix", { enumerable: true, get: function () { return util_1.stripHexPrefix; } });
const address_1 = require("@ethersproject/address");
const weiToGwei = (wei) => wei / 1e9;
exports.weiToGwei = weiToGwei;
const weiToHex = (wei) => (0, util_1.addHexPrefix)(wei.toString(16));
exports.weiToHex = weiToHex;
const gweiToWei = (gwei) => gwei * 1e9;
exports.gweiToWei = gweiToWei;
const gweiToHex = (gwei) => weiToHex(gwei * 1e9);
exports.gweiToHex = gweiToHex;
const hexToInt = (hexStr) => parseInt(hexStr, 16);
exports.hexToInt = hexToInt;
const weiHexToGweiInt = (weiHex) => hexToInt(weiHex) / 1e9;
exports.weiHexToGweiInt = weiHexToGweiInt;
const weiIntToEthInt = (wei) => wei / 1e18;
exports.weiIntToEthInt = weiIntToEthInt;
const gweiToWeiHex = (gwei) => (0, util_1.intToHex)(gweiToWei(gwei));
exports.gweiToWeiHex = gweiToWeiHex;
function roundGwei(gwei) {
    const rounded = gwei >= 10
        ? Math.round(gwei)
        : gwei >= 5
            ? Math.round(gwei * 10) / 10
            : gwei >= 1
                ? Math.round(gwei * 100) / 100
                : Math.round(gwei * 1000) / 1000;
    return parseFloat(rounded.toString());
}
exports.roundGwei = roundGwei;
function randomLetters(num) {
    return [...Array(num)].map(() => String.fromCharCode(65 + (0, crypto_1.randomInt)(0, 26))).join('');
}
exports.randomLetters = randomLetters;
function capitalize(s) {
    if (!s)
        return s;
    return s[0].toUpperCase() + s.substring(1).toLowerCase();
}
exports.capitalize = capitalize;
function arraysEqual(a = [], b = []) {
    if (a.length !== b.length)
        return false;
    return arraysMatch(a.sort(), b.sort());
}
exports.arraysEqual = arraysEqual;
function arraysMatch(a = [], b = []) {
    return a.length === b.length && a.every((elem, i) => b[i] === elem);
}
exports.arraysMatch = arraysMatch;
function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func(...args);
        }, timeout);
    };
}
exports.debounce = debounce;
function instanceOfNodeError(value, errorType) {
    return value instanceof errorType;
}
function getErrorCode(e) {
    if (!instanceOfNodeError(e, Error)) {
        return undefined;
    }
    return e.code;
}
exports.getErrorCode = getErrorCode;
const matchFilter = (filter = '', properties = []) => {
    if (!filter)
        return true;
    const filterItems = filter.split(' ');
    const matchableProperties = properties.filter((prop) => !!prop).map((prop) => prop.toLowerCase());
    return filterItems.every((item = '') => {
        const matchCriteria = item.toLowerCase();
        return matchableProperties.some((prop) => prop.includes(matchCriteria));
    });
};
exports.matchFilter = matchFilter;
function getAddress(address) {
    const lowerCaseAddress = address.toLowerCase();
    try {
        // this will throw if the address can't be checksummed
        return (0, address_1.getAddress)(lowerCaseAddress);
    }
    catch (e) {
        console.warn(`could not checksum address ${address}, using lowercase address`, e);
        return lowerCaseAddress;
    }
}
exports.getAddress = getAddress;
function isNonZeroHex(hex) {
    return !!hex && !['0x', '0x0'].includes(hex);
}
exports.isNonZeroHex = isNonZeroHex;
