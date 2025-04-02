"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVersionFromTypedData = void 0;
const eth_sig_util_1 = require("@metamask/eth-sig-util");
function getVersionFromTypedData(typedData) {
    if (Array.isArray(typedData)) {
        return eth_sig_util_1.SignTypedDataVersion.V1;
    }
    const hasUndefinedType = () => typedData.types[typedData.primaryType].some(({ name }) => typedData.message[name] === undefined);
    const containsArrays = () => Object.values(typedData.types)
        .flat()
        .some(({ type }) => type.endsWith('[]'));
    try {
        // arrays only supported by v4
        if (containsArrays()) {
            return eth_sig_util_1.SignTypedDataVersion.V4;
        }
        // no v4-specific features so could use either v3 or v4 - default to v4 unless data contains undefined types (invalid in v4)
        return hasUndefinedType() ? eth_sig_util_1.SignTypedDataVersion.V3 : eth_sig_util_1.SignTypedDataVersion.V4;
    }
    catch (e) {
        // parsing error - default to v4
        return eth_sig_util_1.SignTypedDataVersion.V4;
    }
}
exports.getVersionFromTypedData = getVersionFromTypedData;
