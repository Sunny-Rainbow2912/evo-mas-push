"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chainUsesOptimismFees = exports.isNetworkEnabled = exports.isNetworkConnected = void 0;
function isNetworkConnected(network) {
    return (network &&
        ((network.connection.primary && network.connection.primary.connected) ||
            (network.connection.secondary && network.connection.secondary.connected)));
}
exports.isNetworkConnected = isNetworkConnected;
function isNetworkEnabled(network) {
    return network.on;
}
exports.isNetworkEnabled = isNetworkEnabled;
function chainUsesOptimismFees(chainId) {
    return [10, 420, 8453, 84531, 84532, 7777777, 11155420].includes(chainId);
}
exports.chainUsesOptimismFees = chainUsesOptimismFees;
