"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountSort = exports.getDefaultAccountName = exports.isDefaultAccountName = exports.hasAddress = exports.accountNS = void 0;
const signer_1 = require("../signer");
exports.accountNS = '114c39e5-cd7d-416f-ab9e-5ab6ab0218ce';
function hasAddress(account, address = '') {
    return account.id.toLowerCase() === address.toLowerCase();
}
exports.hasAddress = hasAddress;
const isDefaultAccountName = ({ name, lastSignerType }) => name.toLowerCase() === (0, exports.getDefaultAccountName)(lastSignerType);
exports.isDefaultAccountName = isDefaultAccountName;
const getDefaultAccountName = (type) => `${(0, signer_1.getSignerDisplayType)(type)} account`;
exports.getDefaultAccountName = getDefaultAccountName;
function accountSort(a, b) {
    try {
        const [aBlockStr, aLocalStr] = a.created.split(':');
        const [bBlockStr, bLocalStr] = b.created.split(':');
        const aLocal = parseInt(aLocalStr);
        const bLocal = parseInt(bLocalStr);
        if (aBlockStr === 'new' && bBlockStr !== 'new')
            return -1;
        if (bBlockStr !== 'new' && aBlockStr === 'new')
            return 1;
        if (aBlockStr === 'new' && bBlockStr === 'new')
            return bLocal - aLocal;
        const aBlock = parseInt(aBlockStr);
        const bBlock = parseInt(bBlockStr);
        return bBlock - aBlock;
    }
    catch (e) {
        console.error(e);
        return 0;
    }
}
exports.accountSort = accountSort;
