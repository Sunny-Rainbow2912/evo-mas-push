"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_HEX = exports.NATIVE_CURRENCY = exports.ADDRESS_DISPLAY_CHARS = exports.NETWORK_PRESETS = exports.ApprovalType = void 0;
var ApprovalType;
(function (ApprovalType) {
    ApprovalType["OtherChainApproval"] = "approveOtherChain";
    ApprovalType["GasLimitApproval"] = "approveGasLimit";
})(ApprovalType = exports.ApprovalType || (exports.ApprovalType = {}));
const NETWORK_PRESETS = {
    ethereum: {
        default: {
            local: 'direct'
        },
        1: {
            pylon: 'wss://evm.pylon.link/mainnet'
        },
        10: {
            pylon: 'wss://evm.pylon.link/optimism'
        },
        137: {
            pylon: 'wss://evm.pylon.link/polygon'
        },
        8453: {
            pylon: 'wss://evm.pylon.link/base-mainnet'
        },
        42161: {
            pylon: 'wss://evm.pylon.link/arbitrum'
        },
        84532: {
            pylon: 'wss://evm.pylon.link/base-sepolia'
        },
        11155111: {
            pylon: 'wss://evm.pylon.link/sepolia'
        },
        11155420: {
            pylon: 'wss://evm.pylon.link/optimism-sepolia'
        }
    }
};
exports.NETWORK_PRESETS = NETWORK_PRESETS;
const ADDRESS_DISPLAY_CHARS = 8;
exports.ADDRESS_DISPLAY_CHARS = ADDRESS_DISPLAY_CHARS;
const NATIVE_CURRENCY = '0x0000000000000000000000000000000000000000';
exports.NATIVE_CURRENCY = NATIVE_CURRENCY;
const MAX_HEX = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
exports.MAX_HEX = MAX_HEX;
