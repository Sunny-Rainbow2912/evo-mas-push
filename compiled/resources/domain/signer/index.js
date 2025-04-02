"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUnavailableSigners = exports.isSignerReady = exports.isHardwareSigner = exports.getSignerDisplayType = exports.getSignerType = exports.Type = void 0;
// in order of increasing priority
var Type;
(function (Type) {
    Type["Ring"] = "ring";
    Type["Seed"] = "seed";
    Type["Trezor"] = "trezor";
    Type["Ledger"] = "ledger";
    Type["Lattice"] = "lattice";
})(Type = exports.Type || (exports.Type = {}));
function getSignerType(typeValue) {
    return Object.values(Type).find((type) => type === typeValue);
}
exports.getSignerType = getSignerType;
function getSignerDisplayType(typeOrSigner = '') {
    const signerType = typeof typeOrSigner === 'string' ? typeOrSigner : typeOrSigner.type;
    return ['ring', 'seed'].includes(signerType.toLowerCase()) ? 'hot' : signerType;
}
exports.getSignerDisplayType = getSignerDisplayType;
function isHardwareSigner(typeOrSigner = '') {
    const signerType = typeof typeOrSigner === 'string' ? typeOrSigner : typeOrSigner.type;
    return ['ledger', 'trezor', 'lattice'].includes(signerType.toLowerCase());
}
exports.isHardwareSigner = isHardwareSigner;
function isSignerReady(signer) {
    return signer.status === 'ok';
}
exports.isSignerReady = isSignerReady;
function findUnavailableSigners(signerTypeValue, signers) {
    if (!isHardwareSigner(signerTypeValue))
        return [];
    return signers.filter((signer) => signer.type === signerTypeValue && !isSignerReady(signer));
}
exports.findUnavailableSigners = findUnavailableSigners;
