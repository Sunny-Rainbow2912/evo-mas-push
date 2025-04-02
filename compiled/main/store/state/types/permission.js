"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionSchema = void 0;
const zod_1 = require("zod");
exports.PermissionSchema = zod_1.z.object({
    origin: zod_1.z.string(),
    provider: zod_1.z.boolean().default(false).describe('Whether or not to grant access to this origin'),
    handlerId: zod_1.z.string()
});
