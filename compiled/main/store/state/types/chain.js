"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChainMetadataSchema = exports.ChainSchema = exports.ChainIdSchema = void 0;
const zod_1 = require("zod");
const colors_1 = require("./colors");
const connection_1 = require("./connection");
const gas_1 = require("./gas");
const nativeCurrency_1 = require("./nativeCurrency");
const layerValues = ['mainnet', 'rollup', 'sidechain', 'testnet'];
exports.ChainIdSchema = zod_1.z.object({
    id: zod_1.z.coerce.number(),
    type: zod_1.z.literal('ethereum')
});
exports.ChainSchema = zod_1.z.object({
    id: zod_1.z.coerce.number(),
    name: zod_1.z.string(),
    on: zod_1.z.boolean(),
    connection: zod_1.z.object({
        primary: connection_1.ConnectionSchema,
        secondary: connection_1.ConnectionSchema
    }),
    layer: zod_1.z.enum(layerValues).optional(),
    isTestnet: zod_1.z.boolean().default(false),
    explorer: zod_1.z.string().default('')
});
exports.ChainMetadataSchema = zod_1.z.object({
    blockHeight: zod_1.z.number().optional(),
    gas: gas_1.GasSchema,
    icon: zod_1.z.string().optional(),
    primaryColor: colors_1.ColorwayPaletteSchema.keyof(),
    nativeCurrency: nativeCurrency_1.NativeCurrencySchema
});
