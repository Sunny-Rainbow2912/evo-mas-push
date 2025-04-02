"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const contracts_1 = require("@ethersproject/contracts");
const providers_1 = require("@ethersproject/providers");
const util_1 = require("@ethereumjs/util");
const provider_1 = __importDefault(require("../provider"));
const contracts_2 = require("../../resources/contracts");
function createWeb3ProviderWrapper(chainId) {
    const wrappedSend = (request, cb) => {
        const wrappedPayload = {
            method: request.method,
            params: request.params || [],
            id: 1,
            jsonrpc: '2.0',
            _origin: 'frame-internal',
            chainId: (0, util_1.addHexPrefix)(chainId.toString(16))
        };
        provider_1.default.sendAsync(wrappedPayload, cb);
    };
    return {
        sendAsync: wrappedSend,
        send: wrappedSend
    };
}
class Erc20Contract {
    constructor(address, chainId) {
        const web3Provider = new providers_1.Web3Provider(createWeb3ProviderWrapper(chainId));
        this.contract = new contracts_1.Contract(address, contracts_2.erc20Interface, web3Provider);
    }
    static isApproval(data) {
        return (data.name === 'approve' &&
            data.functionFragment.inputs.length === 2 &&
            (data.functionFragment.inputs[0].name || '').toLowerCase().endsWith('spender') &&
            data.functionFragment.inputs[0].type === 'address' &&
            (data.functionFragment.inputs[1].name || '').toLowerCase().endsWith('value') &&
            data.functionFragment.inputs[1].type === 'uint256');
    }
    static isTransfer(data) {
        return (data.name === 'transfer' &&
            data.functionFragment.inputs.length === 2 &&
            (data.functionFragment.inputs[0].name || '').toLowerCase().endsWith('to') &&
            data.functionFragment.inputs[0].type === 'address' &&
            (data.functionFragment.inputs[1].name || '').toLowerCase().endsWith('value') &&
            data.functionFragment.inputs[1].type === 'uint256');
    }
    static decodeCallData(calldata) {
        try {
            return contracts_2.erc20Interface.parseTransaction({ data: calldata });
        }
        catch (e) {
            // call does not match ERC-20 interface
        }
    }
    static encodeCallData(fn, params) {
        return contracts_2.erc20Interface.encodeFunctionData(fn, params);
    }
    async getTokenData() {
        const calls = await Promise.all([
            this.contract.decimals().catch(() => 0),
            this.contract.name().catch(() => ''),
            this.contract.symbol().catch(() => ''),
            this.contract
                .totalSupply()
                .then((supply) => supply.toString())
                .catch(() => '') // totalSupply is mandatory on the ERC20 interface
        ]);
        return {
            decimals: calls[0],
            name: calls[1],
            symbol: calls[2],
            totalSupply: calls[3]
        };
    }
}
exports.default = Erc20Contract;
