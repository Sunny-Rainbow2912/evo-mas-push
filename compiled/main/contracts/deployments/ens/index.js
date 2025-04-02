"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("ethers/lib/utils");
const abi_1 = require("./abi");
const store_1 = __importDefault(require("../../../store"));
function decode(abi, calldata) {
    const contractApi = new utils_1.Interface(abi);
    return contractApi.parseTransaction({ data: calldata });
}
function getNameForTokenId(account, tokenId) {
    const ensInventory = (0, store_1.default)('main.inventory', account, 'ens') || {};
    const items = ensInventory.items || {};
    const record = Object.values(items).find((ens) => ens.tokenId === tokenId) || { name: '' };
    return record.name;
}
function ethName(name) {
    // assumes all names will be registered in the .eth domain, in the future this may not be the case
    return name.includes('.eth') ? name : `${name}.eth`;
}
const registrar = ({ name = 'ENS Registrar', address, chainId }) => {
    return {
        name,
        chainId,
        address,
        decode: (calldata, { account } = {}) => {
            const { name, args } = decode(abi_1.registrar, calldata);
            if (['transferfrom', 'safetransferfrom'].includes(name.toLowerCase())) {
                const { from, to, tokenId } = args;
                const token = tokenId.toString();
                const name = (account && getNameForTokenId(account, token)) || '';
                return {
                    id: 'ens:transfer',
                    data: {
                        name: name,
                        from,
                        to,
                        tokenId: token
                    }
                };
            }
            if (name === 'approve') {
                const { to, tokenId } = args;
                const token = tokenId.toString();
                const name = (account && getNameForTokenId(account, token)) || '';
                return {
                    id: 'ens:approve',
                    data: { name, operator: to, tokenId: token }
                };
            }
        }
    };
};
const registarController = ({ name = 'ENS Registrar Controller', address, chainId }) => {
    return {
        name,
        chainId,
        address,
        decode: (calldata) => {
            const { name, args } = decode(abi_1.registrarController, calldata);
            if (name === 'commit') {
                return {
                    id: 'ens:commit'
                };
            }
            if (['register', 'registerwithconfig'].includes(name.toLowerCase())) {
                const { owner, name, duration } = args;
                return {
                    id: 'ens:register',
                    data: { address: owner, name: ethName(name), duration: duration.toNumber() }
                };
            }
            if (name === 'renew') {
                const { name, duration } = args;
                return {
                    id: 'ens:renew',
                    data: { name: ethName(name), duration: duration.toNumber() }
                };
            }
        }
    };
};
const mainnetRegistrar = registrar({
    name: '.eth Permanent Registrar',
    address: '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85',
    chainId: 1
});
const mainnetRegistrarController = registarController({
    name: 'ETHRegistrarController',
    address: '0x283Af0B28c62C092C9727F1Ee09c02CA627EB7F5',
    chainId: 1
});
// TODO: in the future the addresses for these contracts can be discovered in real time
exports.default = [mainnetRegistrar, mainnetRegistrarController];
