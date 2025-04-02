"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.erc20Interface = void 0;
const ethers_1 = require("ethers");
const erc_20_abi_1 = __importDefault(require("../../main/externalData/balances/erc-20-abi"));
exports.erc20Interface = new ethers_1.utils.Interface(erc_20_abi_1.default);
