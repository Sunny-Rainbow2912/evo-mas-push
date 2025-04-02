"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalanceSchema = void 0;
const zod_1 = require("zod");
const token_1 = require("./token");
const CoreBalanceSchema = zod_1.z.object({
    name: zod_1.z.string(),
    symbol: zod_1.z.string(),
    balance: zod_1.z.string().describe('Raw balance, in hex'),
    decimals: zod_1.z.number().positive(),
    displayBalance: zod_1.z.string()
});
exports.BalanceSchema = CoreBalanceSchema.merge(token_1.TokenIdSchema);
