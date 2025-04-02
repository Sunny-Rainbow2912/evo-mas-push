"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OriginSchema = void 0;
const zod_1 = require("zod");
const chain_1 = require("./chain");
const SessionSchema = zod_1.z.object({
    requests: zod_1.z.number().gte(0),
    startedAt: zod_1.z.number().gte(0),
    endedAt: zod_1.z.number().gte(0).optional(),
    lastUpdatedAt: zod_1.z.number().gte(0)
});
exports.OriginSchema = zod_1.z.object({
    chain: chain_1.ChainIdSchema,
    name: zod_1.z.string(),
    session: SessionSchema
});
