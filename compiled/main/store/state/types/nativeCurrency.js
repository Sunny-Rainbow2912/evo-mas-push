"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeCurrencySchema = void 0;
const zod_1 = require("zod");
const rate_1 = require("./rate");
exports.NativeCurrencySchema = zod_1.z.object({
    symbol: zod_1.z.string(),
    icon: zod_1.z.string().default(''),
    name: zod_1.z.string(),
    decimals: zod_1.z.number(),
    usd: rate_1.RateSchema
});
