"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionMatcher = exports.chainIdMatcher = void 0;
const util_1 = require("@ethereumjs/util");
const bignumber_js_1 = require("bignumber.js");
const zod_1 = require("zod");
const matchers_1 = require("../matchers");
exports.chainIdMatcher = zod_1.z
    .string()
    .startsWith('eip155:', {
    message: 'Chain ID must be CAIP-2 chain representation and start with "eip155"'
})
    .transform((id) => (0, util_1.addHexPrefix)((0, bignumber_js_1.BigNumber)(id.split(':')[1]).toString(16)));
exports.sessionMatcher = zod_1.z.string();
const caipRequestParams = zod_1.z.object({
    chainId: exports.chainIdMatcher,
    session: exports.sessionMatcher,
    request: zod_1.z.object({
        method: zod_1.z.string(),
        params: zod_1.z.any()
    })
});
const Caip27Request = (0, matchers_1.createRequestMatcher)('caip_request', caipRequestParams);
function default_1(rpcRequest) {
    const result = Caip27Request.safeParse(rpcRequest);
    if (result.success) {
        const caip27Request = result.data;
        const { jsonrpc, id, _origin } = rpcRequest;
        const { chainId, request } = caip27Request.params;
        const { method, params } = request;
        return {
            jsonrpc,
            id,
            method,
            params,
            chainId,
            _origin
        };
    }
    throw (0, matchers_1.generateError)(result.error);
}
exports.default = default_1;
