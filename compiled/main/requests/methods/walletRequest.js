"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const matchers_1 = require("../matchers");
const caipRequest_1 = require("./caipRequest");
const walletRequestParams = zod_1.z.object({
    chainId: zod_1.z.optional(caipRequest_1.chainIdMatcher),
    session: zod_1.z.optional(caipRequest_1.sessionMatcher),
    request: zod_1.z.object({
        method: zod_1.z.string(),
        params: zod_1.z.any()
    })
});
const WalletRequest = (0, matchers_1.createRequestMatcher)('wallet_request', walletRequestParams);
function default_1(rpcRequest) {
    const result = WalletRequest.safeParse(rpcRequest);
    if (result.success) {
        const walletRequest = result.data;
        const { jsonrpc, id, _origin } = rpcRequest;
        const { request, chainId } = walletRequest.params;
        const { method, params } = request;
        const optionalParams = {
            ...(chainId && { chainId })
        };
        return {
            jsonrpc,
            id,
            method,
            params,
            _origin,
            ...optionalParams
        };
    }
    const errorMessage = result.error.issues[0].message;
    throw new Error(errorMessage);
}
exports.default = default_1;
