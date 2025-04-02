"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const electron_1 = __importDefault(require("electron"));
const conf_1 = __importDefault(require("conf"));
const migrate_1 = __importDefault(require("../migrate"));
class PersistStore extends conf_1.default {
    constructor(options) {
        options = { configFileMode: 0o600, configName: 'config', ...options };
        let defaultCwd = __dirname;
        if (electron_1.default && electron_1.default.app)
            defaultCwd = electron_1.default.app.getPath('userData');
        if (options.cwd) {
            options.cwd = path_1.default.isAbsolute(options.cwd) ? options.cwd : path_1.default.join(defaultCwd, options.cwd);
        }
        else {
            options.cwd = defaultCwd;
        }
        electron_1.default.app.on('quit', () => this.writeUpdates());
        super(options);
        this.blockUpdates = false;
        this.updates = {};
        setInterval(() => this.writeUpdates(), 30 * 1000);
    }
    writeUpdates() {
        if (this.blockUpdates)
            return;
        const updates = { ...this.updates };
        this.updates = null;
        if (Object.keys(updates || {}).length > 0)
            super.set(updates);
    }
    queue(path, value) {
        path = `main.__.${migrate_1.default.latest}.${path}`;
        this.updates = this.updates || {};
        delete this.updates[path]; // maintain entry order
        this.updates[path] = JSON.parse(JSON.stringify(value));
    }
    set(path, value) {
        if (this.blockUpdates)
            return;
        path = `main.__.${migrate_1.default.latest}.${path}`;
        super.set(path, value);
    }
    clear() {
        this.blockUpdates = true;
        super.clear();
    }
}
exports.default = new PersistStore();
