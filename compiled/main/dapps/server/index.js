"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const cookie_1 = require("cookie");
const url_1 = require("url");
const eth_ens_namehash_1 = require("eth-ens-namehash");
const store_1 = __importDefault(require("../../store"));
const sessions_1 = __importDefault(require("./sessions"));
const asset_1 = __importDefault(require("./asset"));
const server = http_1.default.createServer((req, res) => {
    const url = new url_1.URL(req.url || '', `http://${req.headers.host}`);
    const ens = url.hostname.replace('.localhost', '');
    const namehash = (0, eth_ens_namehash_1.hash)(ens);
    const session = (req.headers.cookie && (0, cookie_1.parse)(req.headers.cookie).__frameSession) || '';
    // check if dapp is added before progressing
    if (!(0, store_1.default)('main.dapps', namehash)) {
        res.writeHead(404);
        return res.end('Dapp not installed');
    }
    if (sessions_1.default.verify(ens, session)) {
        return asset_1.default.stream(res, namehash, url.pathname);
    }
    else {
        res.writeHead(403);
        return res.end('No dapp session, launch this dapp from EvoTradeWallet');
    }
});
server.listen(8421, '127.0.0.1');
exports.default = { sessions: sessions_1.default };
