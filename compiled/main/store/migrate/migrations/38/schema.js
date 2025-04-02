"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.v38StateSchema = exports.v38MainSchema = exports.v38ChainsSchema = exports.v38ChainMetadataSchema = exports.v38ChainSchema = void 0;
const zod_1 = require("zod");
const v38MuteSchema = zod_1.z
    .object({
    migrateToPylon: zod_1.z.boolean().default(true)
})
    .passthrough()
    .default({});
const v38ConnectionSchema = zod_1.z
    .object({
    current: zod_1.z.enum(['local', 'custom', 'infura', 'alchemy', 'pylon', 'poa']),
    custom: zod_1.z.string().default('')
})
    .passthrough();
exports.v38ChainSchema = zod_1.z
    .object({
    id: zod_1.z.coerce.number(),
    connection: zod_1.z.object({
        primary: v38ConnectionSchema,
        secondary: v38ConnectionSchema
    })
})
    .passthrough();
exports.v38ChainMetadataSchema = zod_1.z.object({
    ethereum: zod_1.z.object({}).passthrough()
});
const EthereumChainsSchema = zod_1.z.record(zod_1.z.coerce.number(), exports.v38ChainSchema);
exports.v38ChainsSchema = zod_1.z.object({
    ethereum: EthereumChainsSchema
});
exports.v38MainSchema = zod_1.z
    .object({
    networks: exports.v38ChainsSchema,
    networksMeta: exports.v38ChainMetadataSchema,
    mute: v38MuteSchema
})
    .passthrough();
exports.v38StateSchema = zod_1.z
    .object({
    main: exports.v38MainSchema
})
    .passthrough();
