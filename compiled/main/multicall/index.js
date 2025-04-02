"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportsChain = void 0;
const abi_1 = require("@ethersproject/abi");
const util_1 = require("@ethereumjs/util");
const electron_log_1 = __importDefault(require("electron-log"));
const constants_1 = require("./constants");
const multicallInterface = new abi_1.Interface(constants_1.abi);
const memoizedInterfaces = {};
function chainConfig(chainId, eth) {
    return {
        address: constants_1.multicallAddresses[chainId].address,
        version: constants_1.multicallAddresses[chainId].version,
        chainId,
        provider: eth
    };
}
async function makeCall(functionName, params, config) {
    const data = multicallInterface.encodeFunctionData(functionName, params);
    const response = await config.provider.request({
        method: 'eth_call',
        params: [{ to: config.address, data }, 'latest'],
        chainId: (0, util_1.addHexPrefix)(config.chainId.toString(16))
    });
    return multicallInterface.decodeFunctionResult(functionName, response);
}
function buildCallData(calls) {
    return calls.map(({ target, call }) => {
        const [fnSignature, ...params] = call;
        const fnName = getFunctionNameFromSignature(fnSignature);
        const callInterface = getInterface(fnSignature);
        const calldata = callInterface.encodeFunctionData(fnName, params);
        return [target, calldata];
    });
}
function getResultData(results, call, target) {
    const [fnSignature] = call;
    const callInterface = memoizedInterfaces[fnSignature];
    const fnName = getFunctionNameFromSignature(fnSignature);
    try {
        return callInterface.decodeFunctionResult(fnName, results);
    }
    catch (e) {
        electron_log_1.default.warn(`Failed to decode ${fnName},`, { target, results });
        const outputs = callInterface.getFunction(fnName).outputs || [];
        return outputs.map(() => null);
    }
}
function getFunctionNameFromSignature(signature) {
    const m = signature.match(constants_1.functionSignatureMatcher);
    if (!m) {
        throw new Error(`could not parse function name from signature: ${signature}`);
    }
    return (m.groups || {}).signature;
}
function getInterface(functionSignature) {
    if (!(functionSignature in memoizedInterfaces)) {
        memoizedInterfaces[functionSignature] = new abi_1.Interface([functionSignature]);
    }
    return memoizedInterfaces[functionSignature];
}
async function aggregate(calls, config) {
    const aggData = buildCallData(calls);
    const response = await makeCall('aggregate', [aggData], config);
    return calls.map(({ call, returns, target }, i) => {
        const resultData = getResultData(response.returndata[i], call, target);
        return { success: true, returnValues: returns.map((handler, j) => handler(resultData[j])) };
    });
}
async function tryAggregate(calls, config) {
    const aggData = buildCallData(calls);
    const response = await makeCall('tryAggregate', [false, aggData], config);
    return calls.map(({ call, returns, target }, i) => {
        const results = response.result[i];
        if (!results.success) {
            return { success: false, returnValues: [] };
        }
        const resultData = getResultData(results.returndata, call, target);
        return { success: true, returnValues: returns.map((handler, j) => handler(resultData[j])) };
    });
}
// public functions
function supportsChain(chainId) {
    return chainId in constants_1.multicallAddresses;
}
exports.supportsChain = supportsChain;
function default_1(chainId, eth) {
    const config = chainConfig(chainId, eth);
    async function call(calls) {
        return config.version === constants_1.MulticallVersion.V2 ? tryAggregate(calls, config) : aggregate(calls, config);
    }
    return {
        call,
        batchCall: async function (calls, batchSize = 2000) {
            const numBatches = Math.ceil(calls.length / batchSize);
            const fetches = [...Array(numBatches).keys()].map(async (_, batchIndex) => {
                const batchStart = batchIndex * batchSize;
                const batchEnd = batchStart + batchSize;
                const batchCalls = calls.slice(batchStart, batchEnd);
                try {
                    const results = await call(batchCalls);
                    return results;
                }
                catch (e) {
                    electron_log_1.default.error(`multicall error (batch ${batchStart}-${batchEnd}), chainId: ${chainId}, first call: ${JSON.stringify(calls[batchStart])}`, e);
                    return [...Array(batchCalls.length).keys()].map(() => ({ success: false, returnValues: [] }));
                }
            });
            const fetchResults = await Promise.all(fetches);
            const callResults = [].concat(...fetchResults);
            return callResults;
        }
    };
}
exports.default = default_1;
