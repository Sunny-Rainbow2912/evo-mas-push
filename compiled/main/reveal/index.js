"use strict";
// Reveal details about pending transactions
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_log_1 = __importDefault(require("electron-log"));
const ethereum_provider_1 = __importDefault(require("ethereum-provider"));
const util_1 = require("@ethereumjs/util");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const proxy_1 = __importDefault(require("../provider/proxy"));
const nebula_1 = __importDefault(require("../nebula"));
const erc20_1 = __importDefault(require("../contracts/erc20"));
const contracts_1 = require("../contracts");
const ens_1 = __importDefault(require("../contracts/deployments/ens"));
const erc_20_abi_1 = __importDefault(require("../externalData/balances/erc-20-abi"));
const constants_1 = require("../../resources/constants");
// TODO: fix generic typing here
const knownContracts = [...ens_1.default];
const erc20Abi = JSON.stringify(erc_20_abi_1.default);
const nebula = (0, nebula_1.default)();
const provider = new ethereum_provider_1.default(proxy_1.default);
// TODO: Discuss the need to set chain for the proxy connection
provider.setChain('0x1');
async function resolveEntityType(address, chainId) {
    if (!address || !chainId)
        return 'unknown';
    try {
        const payload = {
            method: 'eth_getCode',
            params: [address, 'latest'],
            jsonrpc: '2.0',
            id: 1,
            chainId: (0, util_1.addHexPrefix)(chainId.toString(16)) // TODO: Verify this overrides setChain
        };
        const code = await provider.request(payload);
        const type = code === '0x' || code === '0x0' ? 'external' : 'contract';
        return type;
    }
    catch (e) {
        electron_log_1.default.error(e);
        return 'unknown';
    }
}
async function resolveEnsName(address) {
    try {
        const ensName = (await nebula.ens.reverseLookup([address]))[0];
        return ensName;
    }
    catch (e) {
        electron_log_1.default.warn(e);
        return '';
    }
}
async function recogErc20(contractAddress, chainId, calldata) {
    const decoded = erc20_1.default.decodeCallData(calldata);
    if (contractAddress && decoded) {
        try {
            const contract = new erc20_1.default(contractAddress, chainId);
            const { decimals, name, symbol } = await contract.getTokenData();
            if (erc20_1.default.isApproval(decoded)) {
                const spenderAddress = decoded.args[0].toLowerCase();
                const amount = decoded.args[1].toHexString();
                const [spenderIdentity, contractIdentity] = await Promise.all([
                    surface.identity(spenderAddress, chainId),
                    surface.identity(contractAddress, chainId)
                ]);
                const data = {
                    amount,
                    decimals,
                    name,
                    symbol,
                    spender: {
                        ...spenderIdentity,
                        address: spenderAddress
                    },
                    contract: {
                        address: contractAddress,
                        ...contractIdentity
                    }
                };
                return {
                    id: 'erc20:approve',
                    data,
                    update: (request, { amount }) => {
                        // amount is a hex string
                        const approvedAmount = new bignumber_js_1.default(amount || '').toString();
                        electron_log_1.default.verbose(`Updating Erc20 approve amount to ${approvedAmount} for contract ${contractAddress} and spender ${spenderAddress}`);
                        const txRequest = request;
                        data.amount = amount;
                        txRequest.data.data = erc20_1.default.encodeCallData('approve', [spenderAddress, amount]);
                        if (txRequest.decodedData) {
                            txRequest.decodedData.args[1].value = amount === constants_1.MAX_HEX ? 'unlimited' : approvedAmount;
                        }
                    }
                };
            }
            else if (erc20_1.default.isTransfer(decoded)) {
                const recipient = decoded.args[0].toLowerCase();
                const amount = decoded.args[1].toHexString();
                const identity = await surface.identity(recipient, chainId);
                return {
                    id: 'erc20:transfer',
                    data: { recipient: { address: recipient, ...identity }, amount, decimals, name, symbol }
                };
            }
        }
        catch (e) {
            electron_log_1.default.warn(e);
        }
    }
}
function identifyKnownContractActions(calldata, context) {
    const knownContract = knownContracts.find((contract) => contract.address.toLowerCase() === context.contractAddress.toLowerCase() &&
        contract.chainId === context.chainId);
    if (knownContract) {
        try {
            return knownContract.decode(calldata, context);
        }
        catch (e) {
            electron_log_1.default.warn('Could not decode known contract action', { calldata, context }, e);
        }
    }
}
const surface = {
    identity: async (address = '', chainId) => {
        // Resolve ens, type and other data about address entities
        const results = await Promise.allSettled([
            chainId ? resolveEntityType(address, chainId) : Promise.resolve(''),
            resolveEnsName(address)
        ]);
        const type = results[0].status === 'fulfilled' ? results[0].value : '';
        const ens = results[1].status === 'fulfilled' ? results[1].value : '';
        // TODO: Check the address against various scam dbs
        // TODO: Check the address against user's contact list
        // TODO: Check the address against previously verified contracts
        return { type, ens };
    },
    resolveEntityType,
    decode: async (contractAddress = '', chainId, calldata) => {
        // Decode calldata
        const contractSources = [{ name: 'ERC-20', source: 'Generic ERC-20', abi: erc20Abi }];
        const contractSource = await (0, contracts_1.fetchContract)(contractAddress, chainId);
        if (contractSource) {
            contractSources.push(contractSource);
        }
        for (const { name, source, abi } of contractSources.reverse()) {
            const decodedCall = (0, contracts_1.decodeCallData)(calldata, abi);
            if (decodedCall) {
                return {
                    contractAddress: contractAddress.toLowerCase(),
                    contractName: name,
                    source,
                    ...decodedCall
                };
            }
        }
        electron_log_1.default.warn(`Unable to decode data for contract ${contractAddress}`);
    },
    recog: async (calldata, context) => {
        // Recognize actions from standard tx types
        const actions = [].concat((await recogErc20(context.contractAddress, context.chainId, calldata)) || [], identifyKnownContractActions(calldata, context) || []);
        return actions;
    },
    simulate: async () => { }
};
exports.default = surface;
