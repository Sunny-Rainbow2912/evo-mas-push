"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const getType_1 = __importDefault(require("./getType"));
const verify_1 = require("../../verify");
function getAssetPath(asset, namehash) {
    const rootPath = asset === '/' ? '/index.html' : asset;
    return { rootPath, assetPath: path_1.default.join((0, verify_1.getDappCacheDir)(), namehash, rootPath) };
}
function error(res, message, code = 404) {
    res.writeHead(code || 404);
    res.end(message);
}
exports.default = {
    stream: (res, namehash, asset) => {
        const { rootPath, assetPath } = getAssetPath(asset, namehash);
        const handleError = (err) => {
            console.error(`Could not stream asset: ${asset}`, err);
            error(res, err.message);
        };
        if (fs_1.default.existsSync(assetPath)) {
            try {
                const stream = fs_1.default.createReadStream(assetPath);
                res.setHeader('content-type', (0, getType_1.default)(rootPath));
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
                res.writeHead(200);
                stream.once('error', handleError);
                stream.pipe(res);
            }
            catch (e) {
                handleError(e);
            }
        }
        else {
            error(res, asset === '/' ? 'Dapp not found' : 'Asset not found');
        }
    }
};
