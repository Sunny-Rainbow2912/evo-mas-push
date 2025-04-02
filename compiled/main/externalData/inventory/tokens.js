"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_log_1 = __importDefault(require("electron-log"));
const eth_provider_1 = __importDefault(require("eth-provider"));
const nebula_1 = __importDefault(require("../../nebula"));
const default_tokens_json_1 = __importDefault(require("./default-tokens.json"));
const TOKENS_ENS_DOMAIN = 'tokens.frame.eth';
function isBlacklisted(token) {
    return token.extensions?.omit;
}
class TokenLoader {
    constructor() {
        this.tokens = default_tokens_json_1.default.tokens;
        this.eth = (0, eth_provider_1.default)('frame', { origin: 'frame-internal', name: 'tokenLoader' });
        this.nebula = (0, nebula_1.default)(this.eth);
        this.eth.setChain('0x1');
    }
    async loadTokenList(timeout = 60000) {
        try {
            const updatedTokens = await this.fetchTokenList(timeout);
            electron_log_1.default.info(`Fetched ${updatedTokens.length} tokens`);
            this.tokens = updatedTokens;
            electron_log_1.default.info(`Updated token list to contain ${this.tokens.length} tokens`);
            this.nextLoad = setTimeout(() => this.loadTokenList(), 10 * 60000);
        }
        catch (e) {
            electron_log_1.default.warn('Could not fetch token list', e);
            this.nextLoad = setTimeout(() => this.loadTokenList(), 30000);
        }
    }
    async fetchTokenList(timeout) {
        electron_log_1.default.verbose(`Fetching tokens from ${TOKENS_ENS_DOMAIN}`);
        let timeoutHandle;
        const requestTimeout = new Promise((resolve, reject) => {
            timeoutHandle = setTimeout(() => {
                reject(`Timeout fetching token list from ${TOKENS_ENS_DOMAIN}`);
            }, timeout);
        });
        const cancelTimeout = () => clearTimeout(timeoutHandle);
        return Promise.race([requestTimeout, this.resolveTokens()]).finally(cancelTimeout);
    }
    async resolveTokens() {
        const tokenListRecord = await this.nebula.resolve(TOKENS_ENS_DOMAIN);
        const tokenManifest = await this.nebula.ipfs.getJson(tokenListRecord.record.content);
        return tokenManifest.tokens;
    }
    async start() {
        electron_log_1.default.verbose('Starting token loader');
        return new Promise((resolve) => {
            const startLoading = async () => {
                clearTimeout(connectTimeout);
                // use a lower timeout for the first load
                await this.loadTokenList(8000);
                finishLoading();
            };
            const finishLoading = () => {
                this.eth.off('connect', onConnect);
                resolve();
            };
            const connectTimeout = setTimeout(() => {
                electron_log_1.default.warn('Token loader could not connect to provider, using default list');
                finishLoading();
            }, 5 * 1000);
            const onConnect = startLoading.bind(this);
            if (this.eth.connected)
                return startLoading();
            this.eth.once('connect', onConnect);
        });
    }
    stop() {
        if (this.nextLoad) {
            clearInterval(this.nextLoad);
            this.nextLoad = null;
        }
    }
    getTokens(chains) {
        return this.tokens.filter((token) => !isBlacklisted(token) && chains.includes(token.chainId));
    }
    getBlacklist(chains = []) {
        const chainMatches = (token) => !chains.length || chains.includes(token.chainId);
        return this.tokens.filter((token) => isBlacklisted(token) && chainMatches(token));
    }
}
exports.default = TokenLoader;
