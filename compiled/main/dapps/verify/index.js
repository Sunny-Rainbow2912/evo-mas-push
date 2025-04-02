"use strict";
// A modified version of ipfs-only-hash, https://github.com/alanshaw/ipfs-only-hash/issues/18
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDappVerified = exports.dappPathExists = exports.getDappCacheDir = void 0;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const electron_1 = require("electron");
const ipfs_http_client_1 = require("ipfs-http-client");
const ipfs_unixfs_importer_1 = require("ipfs-unixfs-importer");
const blockstore = {
    get: async (cid) => {
        throw new Error(`unexpected block API get for ${cid}`);
    },
    put: async () => {
        throw new Error('unexpected block API put');
    }
};
const hash = async (content, opts = {}) => {
    const options = {
        ...opts,
        onlyHash: true,
        cidVersion: 0,
        hidden: true
    };
    let lastCID;
    for await (const c of (0, ipfs_unixfs_importer_1.importer)(content, blockstore, options)) {
        lastCID = c.cid;
    }
    return lastCID;
};
const hashFiles = async (path, options) => hash((0, ipfs_http_client_1.globSource)(path, '**'), options);
const getCID = async (path, isDirectory = true) => hashFiles(path, { wrapWithDirectory: isDirectory });
function getDappCacheDir() {
    return path_1.default.join(electron_1.app.getPath('userData'), 'DappCache');
}
exports.getDappCacheDir = getDappCacheDir;
async function dappPathExists(dappId) {
    const cachedDappPath = `${getDappCacheDir()}/${dappId}`;
    try {
        await promises_1.default.access(cachedDappPath);
        return true;
    }
    catch (e) {
        return false;
    }
}
exports.dappPathExists = dappPathExists;
async function isDappVerified(dappId, contentCID) {
    const path = `${getDappCacheDir()}/${dappId}`;
    const cid = await getCID(path);
    return cid?.toV1().toString() === contentCID;
}
exports.isDappVerified = isDappVerified;
