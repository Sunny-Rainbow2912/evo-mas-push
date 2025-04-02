"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasSubscriptionPermission = void 0;
const uuid_1 = require("uuid");
const store_1 = __importDefault(require("../store"));
const trustedOriginIds = ['frame-extension', 'frame-internal'].map((origin) => (0, uuid_1.v5)(origin, uuid_1.v5.DNS));
const isTrustedOrigin = (originId) => trustedOriginIds.includes(originId);
function hasSubscriptionPermission(subType, address, originId) {
    if (subType === "chainsChanged" /* SubscriptionType.CHAINS */ && isTrustedOrigin(originId)) {
        // internal trusted origins are allowed to subscribe to chain changes without approval
        return true;
    }
    if (!address) {
        return false;
    }
    const permissions = ((0, store_1.default)('main.permissions', address) || {});
    const permission = Object.values(permissions).find(({ origin }) => {
        return (0, uuid_1.v5)(origin, uuid_1.v5.DNS) === originId;
    });
    return !!permission?.provider;
}
exports.hasSubscriptionPermission = hasSubscriptionPermission;
