"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColorwayPaletteSchema = exports.ColorwayPrimarySchema = void 0;
const zod_1 = require("zod");
const ColorSchema = zod_1.z.object({
    r: zod_1.z.number(),
    g: zod_1.z.number(),
    b: zod_1.z.number()
});
exports.ColorwayPrimarySchema = zod_1.z.object({
    dark: zod_1.z.object({
        background: zod_1.z.literal('rgb(26, 22, 28)'),
        text: zod_1.z.literal('rgb(241, 241, 255)')
    }),
    light: zod_1.z.object({
        background: zod_1.z.literal('rgb(240, 230, 243)'),
        text: zod_1.z.literal('rgb(20, 40, 60)')
    })
});
exports.ColorwayPaletteSchema = zod_1.z.object({
    accent1: ColorSchema,
    accent2: ColorSchema,
    accent3: ColorSchema,
    accent4: ColorSchema,
    accent5: ColorSchema,
    accent6: ColorSchema,
    accent7: ColorSchema,
    accent8: ColorSchema
});
