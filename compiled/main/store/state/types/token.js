"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenSchema = exports.TokenIdSchema = void 0;
const zod_1 = require("zod");
exports.TokenIdSchema = zod_1.z.object({
    address: zod_1.z.string(),
    chainId: zod_1.z.coerce.number()
});
const CoreTokenSchema = zod_1.z.object({
    name: zod_1.z.string(),
    symbol: zod_1.z.string(),
    decimals: zod_1.z.number().positive(),
    logoURI: zod_1.z.string().default('').optional()
});
exports.TokenSchema = CoreTokenSchema.merge(exports.TokenIdSchema);
