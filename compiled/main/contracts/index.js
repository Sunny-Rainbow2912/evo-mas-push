"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchContract = exports.decodeCallData = void 0;
const electron_log_1 = __importDefault(require("electron-log"));
const abi_1 = require("@ethersproject/abi");
const sourcify_1 = require("./sources/sourcify");
const etherscan_1 = require("./sources/etherscan");
// this list should be in order of descending priority as each source will
// be searched in turn
const fetchSources = [sourcify_1.fetchSourcifyContract, etherscan_1.fetchEtherscanContract];
function parseAbi(abiData) {
    try {
        return new abi_1.Interface(abiData);
    }
    catch (e) {
        electron_log_1.default.warn(`could not parse ABI data: ${abiData}`);
    }
}
function decodeCallData(calldata, abi) {
    const contractInterface = parseAbi(abi);
    if (contractInterface) {
        const sighash = calldata.slice(0, 10);
        try {
            const abiMethod = contractInterface.getFunction(sighash);
            const decoded = contractInterface.decodeFunctionData(sighash, calldata);
            return {
                method: abiMethod.name,
                args: abiMethod.inputs.map((input, i) => ({
                    name: input.name,
                    type: input.type,
                    value: decoded[i].toString()
                }))
            };
        }
        catch (e) {
            electron_log_1.default.warn('unknown ABI method for signature', sighash);
        }
    }
}
exports.decodeCallData = decodeCallData;
async function fetchContract(contractAddress, chainId) {
    const fetches = fetchSources.map((getContract) => getContract(contractAddress, chainId));
    let contract = undefined;
    let i = 0;
    while (!contract && i < fetches.length) {
        contract = await fetches[i];
        i += 1;
    }
    if (!contract) {
        electron_log_1.default.warn(`could not fetch source code for contract ${contractAddress}`);
    }
    return contract;
}
exports.fetchContract = fetchContract;
