"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DappSchema = void 0;
const zod_1 = require("zod");
// TODO: define manifest schema
const ManifestSchema = zod_1.z.any();
exports.DappSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    ens: zod_1.z.string(),
    status: zod_1.z.enum(['initial', 'loading', 'updating', 'ready', 'failed']),
    config: zod_1.z.record(zod_1.z.string(), zod_1.z.string()),
    content: zod_1.z.string().optional(),
    manifest: ManifestSchema,
    openWhenReady: zod_1.z.boolean(),
    checkStatusRetryCount: zod_1.z.number().gte(0).default(0)
});
