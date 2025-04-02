"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const abi_1 = require("@ethersproject/abi");
const util_1 = require("@ethereumjs/util");
const electron_log_1 = __importDefault(require("electron-log"));
const multicall_1 = __importStar(require("../../multicall"));
const erc_20_abi_1 = __importDefault(require("./erc-20-abi"));
const reducers_1 = require("./reducers");
const erc20Interface = new abi_1.Interface(erc_20_abi_1.default);
function createBalance(rawBalance, decimals) {
    return {
        balance: rawBalance,
        displayBalance: new bignumber_js_1.default(rawBalance).shiftedBy(-decimals).toString()
    };
}
function default_1(eth) {
    function balanceCalls(owner, tokens) {
        return tokens.map((token) => ({
            target: token.address,
            call: ['function balanceOf(address address) returns (uint256 value)', owner],
            returns: [
                (bn) => {
                    const hexString = bn ? bn.toHexString() : '0x00';
                    return createBalance(hexString, token.decimals);
                }
            ]
        }));
    }
    async function getNativeCurrencyBalance(address, chainId) {
        try {
            const rawBalance = await eth.request({
                method: 'eth_getBalance',
                params: [address, 'latest'],
                chainId: (0, util_1.addHexPrefix)(chainId.toString(16))
            });
            // TODO: do all coins have 18 decimals?
            return { ...createBalance(rawBalance, 18), chainId };
        }
        catch (e) {
            electron_log_1.default.error(`error loading native currency balance for chain id: ${chainId}`, e);
            return { balance: '0x0', displayValue: '0.0', chainId };
        }
    }
    async function getTokenBalance(token, owner) {
        const functionData = erc20Interface.encodeFunctionData('balanceOf', [owner]);
        const response = await eth.request({
            method: 'eth_call',
            chainId: (0, util_1.addHexPrefix)(token.chainId.toString(16)),
            params: [{ to: token.address, value: '0x0', data: functionData }, 'latest']
        });
        const result = erc20Interface.decodeFunctionResult('balanceOf', response);
        return result.balance.toHexString();
    }
    async function getTokenBalancesFromContracts(owner, tokens) {
        const balances = tokens.map(async (token) => {
            try {
                const rawBalance = await getTokenBalance(token, owner);
                return {
                    ...token,
                    ...createBalance(rawBalance, token.decimals)
                };
            }
            catch (e) {
                electron_log_1.default.warn(`could not load balance for token with address ${token.address}`, e);
                return undefined;
            }
        });
        const loadedBalances = await Promise.all(balances);
        return loadedBalances.filter((bal) => bal !== undefined);
    }
    async function getTokenBalancesFromMulticall(owner, tokens, chainId) {
        const calls = balanceCalls(owner, tokens);
        const results = await (0, multicall_1.default)(chainId, eth).batchCall(calls);
        return results.reduce((acc, result, i) => {
            if (result.success) {
                acc.push({
                    ...tokens[i],
                    ...result.returnValues[0]
                });
            }
            return acc;
        }, []);
    }
    return {
        getCurrencyBalances: async function (address, chains) {
            const fetchChainBalance = getNativeCurrencyBalance.bind(null, address);
            return Promise.all(chains.map(fetchChainBalance));
        },
        getTokenBalances: async function (owner, tokens) {
            const tokensByChain = tokens.reduce(reducers_1.groupByChain, {});
            const tokenBalances = await Promise.all(Object.entries(tokensByChain).map(([chain, tokens]) => {
                const chainId = parseInt(chain);
                return (0, multicall_1.supportsChain)(chainId)
                    ? getTokenBalancesFromMulticall(owner, tokens, chainId)
                    : getTokenBalancesFromContracts(owner, tokens);
            }));
            return [].concat(...tokenBalances);
        }
    };
}
exports.default = default_1;
