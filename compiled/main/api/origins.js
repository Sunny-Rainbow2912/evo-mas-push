"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTrusted = exports.isKnownExtension = exports.parseFrameExtension = exports.updateOrigin = exports.parseOrigin = void 0;
const uuid_1 = require("uuid");
const query_string_1 = __importDefault(require("query-string"));
const accounts_1 = __importDefault(require("../accounts"));
const store_1 = __importDefault(require("../store"));
const dev = process.env.NODE_ENV === 'development';
const activeExtensionChecks = {};
const activePermissionChecks = {};
const extensionPrefixes = {
    chrome: 'chrome-extension',
    firefox: 'moz-extension',
    safari: 'safari-web-extension'
};
const protocolRegex = /^(?:ws|http)s?:\/\//;
// allows the Frame extension to request specific methods
const trustedInternalMethods = ['wallet_getEthereumChains'];
const isTrustedOrigin = (origin) => origin === 'frame-extension' || origin === 'frame-internal';
const isInternalMethod = (method) => trustedInternalMethods.includes(method);
const storeApi = {
    getPermission: (address, origin) => {
        const permissions = (0, store_1.default)('main.permissions', address) || {};
        return Object.values(permissions).find((p) => p.origin === origin);
    },
    getKnownExtension: (id) => (0, store_1.default)('main.knownExtensions', id)
};
function parseOrigin(origin) {
    if (!origin)
        return 'Unknown';
    return origin.replace(protocolRegex, '');
}
exports.parseOrigin = parseOrigin;
function invalidOrigin(origin) {
    return origin !== origin.replace(/[^0-9a-z/:.[\]-]/gi, '');
}
async function getPermission(address, origin, payload) {
    const permission = storeApi.getPermission(address, origin);
    return permission || requestPermission(address, payload);
}
async function requestExtensionPermission(extension) {
    if (extension.id in activeExtensionChecks) {
        return activeExtensionChecks[extension.id];
    }
    const result = new Promise((resolve) => {
        const obs = store_1.default.observer(() => {
            const isActive = extension.id in activeExtensionChecks;
            const isAllowed = (0, store_1.default)('main.knownExtensions', extension.id);
            // wait for a response
            if (isActive && typeof isAllowed !== 'undefined') {
                delete activeExtensionChecks[extension.id];
                obs.remove();
                resolve(isAllowed);
            }
        }, 'origins:requestExtension');
    });
    activeExtensionChecks[extension.id] = result;
    store_1.default.notify('extensionConnect', extension);
    return result;
}
async function requestPermission(address, fullPayload) {
    const { _origin: originId, ...payload } = fullPayload;
    const permissionCheckId = `${address}:${originId}`;
    if (permissionCheckId in activePermissionChecks) {
        return activePermissionChecks[permissionCheckId];
    }
    const result = new Promise((resolve) => {
        const request = {
            payload,
            handlerId: originId,
            type: 'access',
            origin: originId,
            account: address
        };
        accounts_1.default.addRequest(request, () => {
            const { name: originName } = (0, store_1.default)('main.origins', originId);
            const permission = storeApi.getPermission(address, originName);
            delete activePermissionChecks[permissionCheckId];
            resolve(permission);
        });
    });
    activePermissionChecks[permissionCheckId] = result;
    return result;
}
function updateOrigin(requestPayload, origin, connectionMessage = false) {
    const originId = (0, uuid_1.v5)(origin, uuid_1.v5.DNS);
    const existingOrigin = (0, store_1.default)('main.origins', originId);
    if (!connectionMessage) {
        // the extension will attempt to send messages (eth_chainId and net_version) in order
        // to connect. we don't want to store these origins as they'll come from every site
        // the user visits in their browser
        if (existingOrigin) {
            store_1.default.addOriginRequest(originId);
        }
        else {
            store_1.default.initOrigin(originId, {
                name: origin,
                chain: {
                    id: 1,
                    type: 'ethereum'
                }
            });
        }
    }
    const chainId = requestPayload.chainId || `0x${(existingOrigin?.chain.id || 1).toString(16)}`;
    const payload = {
        ...requestPayload,
        _origin: originId
    };
    if (connectionMessage) {
        payload.chainId = chainId;
    }
    return {
        payload,
        chainId
    };
}
exports.updateOrigin = updateOrigin;
function parseFrameExtension(req) {
    const origin = req.headers.origin || '';
    const query = query_string_1.default.parse((req.url || '').replace('/', ''));
    const hasExtensionIdentity = query.identity === 'frame-extension';
    if (origin === 'chrome-extension://ldcoohedfbjoobcadoglnnmmfbdlmmhf') {
        // Match production chrome
        return { browser: 'chrome', id: 'ldcoohedfbjoobcadoglnnmmfbdlmmhf' };
    }
    else if (origin.startsWith(`${extensionPrefixes.chrome}://`) && dev && hasExtensionIdentity) {
        // Match Chrome in dev
        const extensionId = origin.substring(extensionPrefixes.chrome.length + 3);
        return { browser: 'chrome', id: extensionId };
    }
    else if (origin.startsWith(`${extensionPrefixes.firefox}://`) && hasExtensionIdentity) {
        // Match production Firefox
        const extensionId = origin.substring(extensionPrefixes.firefox.length + 3);
        return { browser: 'firefox', id: extensionId };
    }
    else if (origin.startsWith(`${extensionPrefixes.safari}://`) && dev && hasExtensionIdentity) {
        // Match Safari in dev only
        return { browser: 'safari', id: 'frame-dev' };
    }
}
exports.parseFrameExtension = parseFrameExtension;
async function isKnownExtension(extension) {
    if (extension.browser === 'chrome' || extension.browser === 'safari')
        return true;
    const extensionPermission = storeApi.getKnownExtension(extension.id);
    return extensionPermission ?? requestExtensionPermission(extension);
}
exports.isKnownExtension = isKnownExtension;
async function isTrusted(payload) {
    // Permission granted to unknown origins only persist until the Frame is closed, they are not permanent
    const { name: originName } = (0, store_1.default)('main.origins', payload._origin);
    const currentAccount = accounts_1.default.current();
    if (isTrustedOrigin(originName) && isInternalMethod(payload.method)) {
        return true;
    }
    if (invalidOrigin(originName) || !currentAccount) {
        return false;
    }
    const permission = await getPermission(currentAccount.address, originName, payload);
    return !!permission?.provider;
}
exports.isTrusted = isTrusted;
