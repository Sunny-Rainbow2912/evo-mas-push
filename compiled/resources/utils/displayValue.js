"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.displayValueData = void 0;
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const utils_1 = require("ethers/lib/utils");
const displayUnitMapping = {
    million: {
        lowerBound: (0, bignumber_js_1.default)('1000000'),
        upperBound: (0, bignumber_js_1.default)('1000000000'),
        unitDisplay: 'M'
    },
    billion: {
        lowerBound: (0, bignumber_js_1.default)('1000000000'),
        upperBound: (0, bignumber_js_1.default)('1000000000000'),
        unitDisplay: 'B'
    },
    trillion: {
        lowerBound: (0, bignumber_js_1.default)('1000000000000'),
        upperBound: (0, bignumber_js_1.default)('1000000000000000'),
        unitDisplay: 'T'
    },
    quadrillion: {
        lowerBound: (0, bignumber_js_1.default)('1000000000000000'),
        upperBound: (0, bignumber_js_1.default)('999999000000000000000'),
        unitDisplay: 'Q'
    }
};
function isLargeNumber(bn) {
    const largeNumberDisplayKeys = Object.keys(displayUnitMapping);
    const firstLargeNumberDisplayKey = largeNumberDisplayKeys[0];
    const firstLargeNumberDisplayValue = displayUnitMapping[firstLargeNumberDisplayKey];
    return bn.isGreaterThanOrEqualTo(firstLargeNumberDisplayValue.lowerBound);
}
function getDisplay(bn, type, decimals, displayFullValue) {
    // zero
    if (bn.isZero()) {
        return {
            displayValue: type === 'fiat' ? bn.toFixed(decimals) : bn.toFormat()
        };
    }
    const value = bn.decimalPlaces(decimals, bignumber_js_1.default.ROUND_FLOOR);
    // minimum display value
    if (value.isZero()) {
        return {
            approximationSymbol: '<',
            displayValue: (0, bignumber_js_1.default)(`1e-${decimals}`).toFormat()
        };
    }
    // small numbers
    if (displayFullValue || !isLargeNumber(value)) {
        return {
            displayValue: value.toFormat(type === 'fiat' ? decimals : undefined)
        };
    }
    // shorthand display of large numbers
    for (const [unitName, { lowerBound, upperBound, unitDisplay }] of Object.entries(displayUnitMapping)) {
        if (value.isGreaterThanOrEqualTo(lowerBound) && value.isLessThan(upperBound)) {
            return {
                displayValue: value
                    .shiftedBy(-(lowerBound.sd(true) - 1))
                    .decimalPlaces(2, bignumber_js_1.default.ROUND_FLOOR)
                    .toFormat(),
                displayUnit: {
                    fullName: unitName,
                    shortName: unitDisplay
                }
            };
        }
    }
    // maximum display value
    const displayUnitKeys = Object.keys(displayUnitMapping);
    const lastDisplayUnitKey = displayUnitKeys[displayUnitKeys.length - 1];
    const lastDisplayUnitValue = displayUnitMapping[lastDisplayUnitKey];
    return {
        approximationSymbol: '>',
        displayValue: '999,999',
        displayUnit: {
            fullName: lastDisplayUnitKey,
            shortName: lastDisplayUnitValue.unitDisplay
        }
    };
}
function displayValueData(sourceValue, params) {
    const { currencyRate, decimals = 18, isTestnet = false, displayFullValue = false } = (params || {});
    const bn = (0, bignumber_js_1.default)(sourceValue, (0, utils_1.isHexString)(sourceValue) ? 16 : undefined);
    const currencyHelperMap = {
        fiat: ({ displayDecimals } = { displayDecimals: true }) => {
            const nativeCurrency = (0, bignumber_js_1.default)(isTestnet || !currencyRate ? 0 : currencyRate.price);
            const displayedDecimals = displayDecimals ? 2 : 0;
            const value = bn.shiftedBy(-decimals).multipliedBy(nativeCurrency);
            if (isTestnet || value.isNaN() || !currencyRate) {
                return {
                    value,
                    displayValue: '?'
                };
            }
            return {
                value,
                ...getDisplay(value, 'fiat', displayedDecimals, displayFullValue)
            };
        },
        ether: ({ displayDecimals } = { displayDecimals: true }) => {
            const value = bn.shiftedBy(-decimals);
            const getDisplayedDecimals = () => {
                if (!displayDecimals)
                    return 0;
                const preDecimalStr = value.toFixed(1, bignumber_js_1.default.ROUND_FLOOR).split('.')[0];
                const numNonDecimals = preDecimalStr === '0' ? 0 : preDecimalStr.length;
                return (0, bignumber_js_1.default)(6)
                    .minus(bignumber_js_1.default.min(6, bignumber_js_1.default.min(6, numNonDecimals)))
                    .toNumber();
            };
            return {
                value,
                ...getDisplay(value, 'ether', getDisplayedDecimals(), displayFullValue)
            };
        },
        gwei: () => {
            const value = bn.shiftedBy(-9).decimalPlaces(2, bignumber_js_1.default.ROUND_FLOOR);
            return {
                value,
                displayValue: value.isZero() ? '0' : value.toFormat()
            };
        },
        wei: () => ({
            value: bn,
            displayValue: bn.toFormat(0)
        })
    };
    return {
        bn,
        ...currencyHelperMap
    };
}
exports.displayValueData = displayValueData;
