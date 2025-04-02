"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDerivationPath = exports.deriveHDAccounts = exports.Derivation = void 0;
const hdkey_1 = __importDefault(require("hdkey"));
const util_1 = require("@ethereumjs/util");
var Derivation;
(function (Derivation) {
    Derivation["live"] = "live";
    Derivation["legacy"] = "legacy";
    Derivation["standard"] = "standard";
    Derivation["testnet"] = "testnet";
})(Derivation = exports.Derivation || (exports.Derivation = {}));
function deriveHDAccounts(publicKey, chainCode, cb) {
    try {
        const hdk = new hdkey_1.default();
        hdk.publicKey = Buffer.from(publicKey, 'hex');
        hdk.chainCode = Buffer.from(chainCode, 'hex');
        const derive = (index) => {
            const derivedKey = hdk.derive(`m/${index}`);
            const address = (0, util_1.publicToAddress)(derivedKey.publicKey, true);
            return (0, util_1.toChecksumAddress)(`0x${address.toString('hex')}`);
        };
        const accounts = [];
        for (let i = 0; i < 100; i++) {
            accounts[i] = derive(i);
        }
        cb(null, accounts);
    }
    catch (e) {
        cb(e, undefined);
    }
}
exports.deriveHDAccounts = deriveHDAccounts;
const derivationPaths = {
    [Derivation.legacy.valueOf()]: "44'/60'/0'/<index>",
    [Derivation.standard.valueOf()]: "44'/60'/0'/0/<index>",
    [Derivation.testnet.valueOf()]: "44'/1'/0'/0/<index>",
    [Derivation.live.valueOf()]: "44'/60'/<index>'/0/0"
};
function getDerivationPath(derivation, index = -1) {
    const path = derivationPaths[derivation.valueOf()];
    return path.replace('<index>', (index > -1 ? index : '').toString());
}
exports.getDerivationPath = getDerivationPath;
