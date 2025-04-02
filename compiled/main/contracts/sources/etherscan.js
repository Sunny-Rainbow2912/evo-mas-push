"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchEtherscanContract = exports.chainSupported = void 0;
const electron_log_1 = __importDefault(require("electron-log"));
const fetch_1 = require("../../../resources/utils/fetch");
const sourceCapture = /^https?:\/\/(?:api[.-]?)?(?<source>.*)\//;
const getEndpoint = (domain, contractAddress, apiKey) => {
    return `https://${domain}/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${apiKey}`;
};
const endpointMap = {
    1: (contractAddress) => getEndpoint('api.etherscan.io', contractAddress, '3SYU5MW5QK8RPCJV1XVICHWKT774993S24'),
    10: (contractAddress) => getEndpoint('api-optimistic.etherscan.io', contractAddress, '3SYU5MW5QK8RPCJV1XVICHWKT774993S24'),
    137: (contractAddress) => getEndpoint('api.polygonscan.com', contractAddress, '2P3U9T63MT26T1X64AAE368UNTS9RKEEBB'),
    42161: (contractAddress) => getEndpoint('api.arbiscan.io', contractAddress, 'VP126CP67QVH9ZEKAZT1UZ751VZ6ZTIZAD')
};
async function parseResponse(response) {
    if (response?.status === 200 &&
        (response?.headers.get('content-type') || '').toLowerCase().includes('json')) {
        return response.json();
    }
    return Promise.resolve(undefined);
}
async function fetchSourceCode(endpointUrl) {
    try {
        const res = await (0, fetch_1.fetchWithTimeout)(endpointUrl, {}, 4000);
        const parsedResponse = await parseResponse(res);
        return parsedResponse?.message === 'OK' ? parsedResponse.result : undefined;
    }
    catch (e) {
        electron_log_1.default.warn('Source code response parsing error', e);
        return undefined;
    }
}
function chainSupported(chainId) {
    return Object.keys(endpointMap).includes(chainId);
}
exports.chainSupported = chainSupported;
async function fetchEtherscanContract(contractAddress, chainId) {
    if (!(chainId in endpointMap)) {
        return;
    }
    const endpointChain = chainId;
    try {
        const endpoint = endpointMap[endpointChain](contractAddress);
        const result = await fetchSourceCode(endpoint);
        // etherscan compatible
        if (result?.length) {
            const source = result[0];
            const implementation = source.Implementation;
            if (implementation && implementation !== contractAddress) {
                // this is a proxy contract, return the ABI for the source
                return fetchEtherscanContract(implementation, chainId);
            }
            if (source.ABI === 'Contract source code not verified') {
                electron_log_1.default.warn(`Contract ${contractAddress} does not have verified ABI in Etherscan`);
                return undefined;
            }
            return {
                abi: source.ABI,
                name: source.ContractName,
                source: endpoint.match(sourceCapture)?.groups?.source || ''
            };
        }
    }
    catch (e) {
        electron_log_1.default.warn(`Contract ${contractAddress} not found in Etherscan`, e);
    }
}
exports.fetchEtherscanContract = fetchEtherscanContract;
