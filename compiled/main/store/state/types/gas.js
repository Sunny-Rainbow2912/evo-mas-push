"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GasSchema = exports.GasFeesSchema = void 0;
const zod_1 = require("zod");
const GasLevelsSchema = zod_1.z.object({
    slow: zod_1.z.string().optional(),
    standard: zod_1.z.string().optional(),
    fast: zod_1.z.string().optional(),
    asap: zod_1.z.string().optional(),
    custom: zod_1.z.string().optional()
});
const GasEstimateSchema = zod_1.z.object({
    gasEstimate: zod_1.z.string(),
    cost: zod_1.z.object({
        usd: zod_1.z.number().nullish()
    })
});
const GasSampleSchema = zod_1.z.object({
    label: zod_1.z.string(),
    estimates: zod_1.z
        .object({
        low: GasEstimateSchema,
        high: GasEstimateSchema
    })
        .partial()
});
// TODO: validate these fields as hex amount values
exports.GasFeesSchema = zod_1.z
    .object({
    nextBaseFee: zod_1.z.string(),
    maxBaseFeePerGas: zod_1.z.string(),
    maxPriorityFeePerGas: zod_1.z.string(),
    maxFeePerGas: zod_1.z.string()
})
    .partial();
exports.GasSchema = zod_1.z.object({
    samples: zod_1.z.array(GasSampleSchema).default([]),
    price: zod_1.z.object({
        selected: GasLevelsSchema.keyof(),
        levels: GasLevelsSchema,
        fees: exports.GasFeesSchema.optional()
    })
});
