"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const electron_log_1 = __importDefault(require("electron-log"));
const schema_1 = require("./schema");
const pylonChainIds = ['1', '5', '10', '137', '42161', '11155111'];
const retiredChainIds = ['3', '4', '42'];
const chainsToMigrate = [...pylonChainIds, ...retiredChainIds];
// because this is the first migration that uses Zod parsing and validation,
// create a version of the schema that removes invalid chains, allowing them to
// also be "false" so that we can filter them out later in a transform. future migrations
// that use this schema can be sure that the chains are all valid afterwards
const ParsedChainSchema = zod_1.z.union([schema_1.v38ChainSchema, zod_1.z.boolean()]).catch(false);
const EthereumChainsSchema = zod_1.z.record(zod_1.z.coerce.number(), ParsedChainSchema).transform((chains) => {
    // remove any chains that failed to parse, which will now be set to "false"
    // TODO: we can insert default chain data here from the state defaults in the future
    return Object.fromEntries(Object.entries(chains).filter(([id, chain]) => {
        if (chain === false) {
            electron_log_1.default.info(`Migration 38: removing invalid chain ${id} from state`);
            return false;
        }
        return true;
    }));
});
const ChainsSchema = schema_1.v38ChainsSchema.merge(zod_1.z.object({
    ethereum: EthereumChainsSchema
}));
const MainSchema = schema_1.v38MainSchema
    .merge(zod_1.z.object({
    networks: ChainsSchema
}))
    .passthrough();
const StateSchema = schema_1.v38StateSchema.merge(zod_1.z.object({ main: MainSchema })).passthrough();
const migrate = (initial) => {
    let showMigrationWarning = false;
    const updateChain = (chain) => {
        const removeRpcConnection = (connection) => {
            const isServiceRpc = connection.current === 'infura' || connection.current === 'alchemy';
            if (isServiceRpc) {
                electron_log_1.default.info(`Migration 38: removing ${connection.current} preset from chain ${chain.id}`);
                showMigrationWarning = true;
            }
            return {
                ...connection,
                current: isServiceRpc ? 'custom' : connection.current,
                custom: isServiceRpc ? '' : connection.custom
            };
        };
        const { primary, secondary } = chain.connection;
        const updatedChain = {
            ...chain,
            connection: {
                ...chain.connection,
                primary: removeRpcConnection(primary),
                secondary: removeRpcConnection(secondary)
            }
        };
        return updatedChain;
    };
    try {
        const state = StateSchema.parse(initial);
        const chainEntries = Object.entries(state.main.networks.ethereum);
        const migratedChains = chainEntries
            .filter(([id]) => chainsToMigrate.includes(id))
            .map(([id, chain]) => [id, updateChain(chain)]);
        state.main.networks.ethereum = Object.fromEntries([...chainEntries, ...migratedChains]);
        state.main.mute.migrateToPylon = !showMigrationWarning;
        return state;
    }
    catch (e) {
        electron_log_1.default.error('Migration 38: could not parse state', e);
    }
    return initial;
};
exports.default = {
    version: 38,
    migrate
};
