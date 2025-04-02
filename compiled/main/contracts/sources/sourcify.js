"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchSourcifyContract = void 0;
const electron_log_1 = __importDefault(require("electron-log"));
const fetch_1 = require("../../../resources/utils/fetch");
function getEndpointUrl(contractAddress, chainId) {
    return `https://sourcify.dev/server/files/any/${chainId}/${contractAddress}`;
}
async function parseResponse(response) {
    if (response?.status === 200 &&
        (response?.headers.get('content-type') || '').toLowerCase().includes('json')) {
        return await response.json();
    }
    return Promise.resolve(undefined);
}
async function fetchSourceCode(contractAddress, chainId) {
    const endpointUrl = getEndpointUrl(contractAddress, chainId);
    try {
        const res = await (0, fetch_1.fetchWithTimeout)(endpointUrl, {}, 4000);
        const parsedResponse = await parseResponse(res);
        return parsedResponse && ['partial', 'full'].includes(parsedResponse.status)
            ? JSON.parse(parsedResponse.files[0].content)
            : Promise.reject(`Contract ${contractAddress} not found in Sourcify`);
    }
    catch (e) {
        electron_log_1.default.warn(e.name === 'AbortError' ? 'Sourcify request timed out' : 'Unable to parse Sourcify response', e);
        return undefined;
    }
}
async function fetchSourcifyContract(contractAddress, chainId) {
    try {
        const result = await fetchSourceCode(contractAddress, chainId);
        if (result?.output) {
            const { abi, devdoc: { title } } = result.output;
            return { abi: JSON.stringify(abi), name: title, source: 'sourcify' };
        }
    }
    catch (e) {
        electron_log_1.default.warn(`Contract ${contractAddress} not found in Sourcify`, e);
    }
}
exports.fetchSourcifyContract = fetchSourcifyContract;
