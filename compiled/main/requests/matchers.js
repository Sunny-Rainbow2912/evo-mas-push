"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateError = exports.createRequestMatcher = void 0;
const zod_1 = require("zod");
function createRequestMatcher(method, params) {
    return zod_1.z.object({
        id: zod_1.z.number(),
        jsonrpc: zod_1.z.literal('2.0'),
        params
    });
}
exports.createRequestMatcher = createRequestMatcher;
function generateError(err) {
    const { message: errorMessage = '' } = err.issues[0] || {};
    if (errorMessage.toLowerCase() === 'required') {
        const field = err.issues[0].path.pop();
        return new Error(`${field} parameter is required`);
    }
    return new Error(errorMessage);
}
exports.generateError = generateError;
