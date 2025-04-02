"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MainSchema = void 0;
const zod_1 = require("zod");
const account_1 = require("./account");
const balance_1 = require("./balance");
const chain_1 = require("./chain");
const colors_1 = require("./colors");
const dapp_1 = require("./dapp");
const origin_1 = require("./origin");
const permission_1 = require("./permission");
const shortcuts_1 = require("./shortcuts");
const ShortcutsSchema = zod_1.z.object({
    summon: shortcuts_1.ShortcutSchema
});
const UpdaterPreferencesSchema = zod_1.z.object({
    dontRemind: zod_1.z.array(zod_1.z.string())
});
// these are individual keys on the main state object
const PreferencesSchema = {
    launch: zod_1.z.boolean().default(false).describe('Launch EvoTradeWallet on system start'),
    reveal: zod_1.z.boolean().default(false).describe('Show EvoTradeWallet when user glides mouse to edge of screen'),
    autohide: zod_1.z.boolean().default(false).describe('Automatically hide EvoTradeWallet when it loses focus'),
    accountCloseLock: zod_1.z
        .boolean()
        .default(false)
        .describe("Lock an account when it's closed instead of when EvoTradeWallet restarts"),
    showLocalNameWithENS: zod_1.z.boolean(),
    menubarGasPrice: zod_1.z.boolean().default(false).describe('Show gas price in menu bar'),
    hardwareDerivation: zod_1.z.string()
};
const notificationTypes = zod_1.z.enum([
    'alphaWarning',
    'welcomeWarning',
    'externalLinkWarning',
    'explorerWarning',
    'signerRelockChange',
    'gasFeeWarning',
    'betaDisclosure',
    'onboardingWindow',
    'signerCompatibilityWarning',
    'migrateToPylon'
]);
exports.MainSchema = zod_1.z.object({
    _version: zod_1.z.coerce.number(),
    instanceId: zod_1.z.string(),
    networks: zod_1.z.object({
        ethereum: zod_1.z.record(zod_1.z.coerce.number(), chain_1.ChainSchema)
    }),
    networksMeta: zod_1.z.object({
        ethereum: zod_1.z.record(zod_1.z.coerce.number(), chain_1.ChainMetadataSchema)
    }),
    origins: zod_1.z.record(zod_1.z.string().describe('Origin Id'), origin_1.OriginSchema),
    knownExtensions: zod_1.z.record(zod_1.z.string(), zod_1.z.boolean()),
    permissions: zod_1.z.record(zod_1.z.string().describe('Address'), zod_1.z.record(zod_1.z.string().describe('Origin Id'), permission_1.PermissionSchema)),
    accounts: zod_1.z.record(zod_1.z.string(), account_1.AccountSchema),
    accountsMeta: zod_1.z.record(zod_1.z.string(), account_1.AccountMetadataSchema),
    balances: zod_1.z.record(zod_1.z.string().describe('Address'), zod_1.z.array(balance_1.BalanceSchema)),
    dapps: zod_1.z.record(zod_1.z.string(), dapp_1.DappSchema),
    mute: zod_1.z.record(notificationTypes, zod_1.z.boolean()),
    colorway: zod_1.z.enum(['light', 'dark']),
    colorwayPrimary: colors_1.ColorwayPrimarySchema,
    shortcuts: ShortcutsSchema,
    updater: UpdaterPreferencesSchema,
    ...PreferencesSchema
});
