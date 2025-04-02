"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const eth_ens_namehash_1 = require("eth-ens-namehash");
const store_1 = __importDefault(require("../../../store"));
const nebula_1 = __importDefault(require("../../../nebula"));
const nebula = (0, nebula_1.default)();
const resolve = {
    rootCid: async (app) => {
        const cid = (0, store_1.default)(`main.dapp.details.${(0, eth_ens_namehash_1.hash)(app)}.cid`);
        if (cid)
            return cid;
        const resolved = await nebula.resolve(app);
        return resolved.record.content;
    }
};
exports.default = resolve;
