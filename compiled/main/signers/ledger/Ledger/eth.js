"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_log_1 = __importDefault(require("electron-log"));
const rlp_1 = require("rlp");
const util_1 = require("@ethereumjs/util");
const eth_sig_util_1 = require("@metamask/eth-sig-util");
const hw_app_eth_1 = __importDefault(require("@ledgerhq/hw-app-eth"));
const derive_1 = require("../../Signer/derive");
const transaction_1 = require("../../../transaction");
const _1 = require(".");
class LedgerEthereumApp {
    constructor(transport) {
        this.eth = new hw_app_eth_1.default(transport);
    }
    async close() {
        return this.eth.transport.close();
    }
    async deriveAddresses(derivation) {
        electron_log_1.default.info(`deriving ${derivation} Ledger addresses`);
        const path = (0, derive_1.getDerivationPath)(derivation);
        const executor = async (resolve, reject) => {
            try {
                const result = await this.getAddress(path, false, true);
                (0, derive_1.deriveHDAccounts)(result.publicKey, result.chainCode || '', (err, addresses) => {
                    if (err)
                        return reject(err);
                    resolve(addresses);
                });
            }
            catch (err) {
                reject(err);
            }
        };
        return new Promise(executor);
    }
    async signMessage(path, message) {
        const rawMessage = (0, util_1.stripHexPrefix)(message);
        const signature = await this.eth.signPersonalMessage(path, rawMessage);
        const hashedSignature = signature.r + signature.s + (0, util_1.padToEven)((signature.v - 27).toString(16));
        return (0, util_1.addHexPrefix)(hashedSignature);
    }
    async signTypedData(path, typedData) {
        let domainSeparatorHex, hashStructMessageHex;
        try {
            const { domain, types, primaryType, message } = eth_sig_util_1.TypedDataUtils.sanitizeData(typedData);
            domainSeparatorHex = eth_sig_util_1.TypedDataUtils.hashStruct('EIP712Domain', domain, types, eth_sig_util_1.SignTypedDataVersion.V4).toString('hex');
            hashStructMessageHex = eth_sig_util_1.TypedDataUtils.hashStruct(primaryType, message, types, eth_sig_util_1.SignTypedDataVersion.V4).toString('hex');
        }
        catch (e) {
            throw new _1.DeviceError('Invalid typed data', 99901);
        }
        const signature = await this.eth.signEIP712HashedMessage(path, domainSeparatorHex, hashStructMessageHex);
        const hashedSignature = signature.r + signature.s + (0, util_1.padToEven)((signature.v - 27).toString(16));
        return (0, util_1.addHexPrefix)(hashedSignature);
    }
    async signTransaction(path, ledgerTx) {
        const signedTx = await (0, transaction_1.sign)(ledgerTx, (tx) => {
            // legacy transactions aren't RLP encoded before they're returned
            const message = tx.getMessageToSign(false);
            const legacyMessage = message[0] !== tx.type;
            const rawTxHex = legacyMessage ? Buffer.from((0, rlp_1.encode)(message)).toString('hex') : message.toString('hex');
            return this.eth.signTransaction(path, rawTxHex, null);
        });
        return (0, util_1.addHexPrefix)(signedTx.serialize().toString('hex'));
    }
    async getAddress(path, display, chainCode) {
        return this.eth.getAddress(path, display, chainCode);
    }
    async getAppConfiguration() {
        return this.eth.getAppConfiguration();
    }
}
exports.default = LedgerEthereumApp;
