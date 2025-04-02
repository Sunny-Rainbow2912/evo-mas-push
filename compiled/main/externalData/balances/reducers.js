"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupByChain = void 0;
function groupByChain(grouped, token) {
    return {
        ...grouped,
        [token.chainId]: [...(grouped[token.chainId] || []), token]
    };
}
exports.groupByChain = groupByChain;
