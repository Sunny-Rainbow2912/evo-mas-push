"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountViewTitles = exports.isTypedMessageSignatureRequest = exports.isTransactionRequest = exports.isSignatureRequest = exports.getSignatureRequestClass = exports.isCancelableRequest = void 0;
const utils_1 = require("../../utils");
const isCancelableRequest = (status) => {
    return !['sent', 'sending', 'verifying', 'confirming', 'confirmed', 'error', 'declined'].includes(status);
};
exports.isCancelableRequest = isCancelableRequest;
const getSignatureRequestClass = ({ status = '' }) => `signerRequest ${(0, utils_1.capitalize)(status)}`;
exports.getSignatureRequestClass = getSignatureRequestClass;
const isSignatureRequest = (request) => {
    return ['sign', 'signTypedData', 'signErc20Permit'].includes(request.type);
};
exports.isSignatureRequest = isSignatureRequest;
const isTransactionRequest = (request) => request.type === 'transaction';
exports.isTransactionRequest = isTransactionRequest;
const isTypedMessageSignatureRequest = (request) => ['signTypedData', 'signErc20Permit'].includes(request.type);
exports.isTypedMessageSignatureRequest = isTypedMessageSignatureRequest;
exports.accountViewTitles = {
    sign: 'Sign Message',
    signTypedData: 'Sign Data',
    signErc20Permit: 'Sign Token Permit',
    transaction: 'Sign Transaction',
    access: 'Account Access',
    addChain: 'Add Chain',
    switchChain: 'Switch Chain',
    addToken: 'Add Token'
};
