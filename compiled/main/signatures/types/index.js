"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const eip2612Permit = {
    types: {
        Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' }
        ]
    },
    domainFilter: ['chainId', 'verifyingContract']
};
const signatureTypes = {
    signErc20Permit: eip2612Permit
};
exports.default = signatureTypes;
