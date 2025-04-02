"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_log_1 = __importDefault(require("electron-log"));
const legacy_1 = __importDefault(require("./migrations/legacy"));
const _38_1 = __importDefault(require("./migrations/38"));
const _39_1 = __importDefault(require("./migrations/39"));
const _40_1 = __importDefault(require("./migrations/40"));
const _41_1 = __importDefault(require("./migrations/41"));
const migrations = [
    ...legacy_1.default,
    _38_1.default,
    _39_1.default,
    _40_1.default,
    _41_1.default
].sort((m1, m2) => m1.version - m2.version);
// Version number of latest known migration
const latest = migrations[migrations.length - 1].version;
exports.default = {
    // Apply migrations to current state
    apply: (state, migrateToVersion = latest) => {
        state.main._version = state.main._version || 0;
        migrations.forEach(({ version, migrate }) => {
            if (state.main._version < version && version <= migrateToVersion) {
                electron_log_1.default.info(`Applying state migration: ${version}`);
                state = migrate(state);
                state.main._version = version;
            }
        });
        return state;
    },
    latest
};
