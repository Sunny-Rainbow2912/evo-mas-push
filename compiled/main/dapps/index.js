"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const stream_1 = require("stream");
const eth_ens_namehash_1 = require("eth-ens-namehash");
const electron_log_1 = __importDefault(require("electron-log"));
const crypto_1 = __importDefault(require("crypto"));
const tar_fs_1 = __importDefault(require("tar-fs"));
const store_1 = __importDefault(require("../store"));
const nebula_1 = __importDefault(require("../nebula"));
const server_1 = __importDefault(require("./server"));
const extractColors_1 = __importDefault(require("../windows/extractColors"));
const verify_1 = require("./verify");
const nebula = (0, nebula_1.default)();
class DappStream extends stream_1.Readable {
    constructor(hash) {
        super();
        this.start(hash);
    }
    async start(hash) {
        for await (const buf of nebula.ipfs.get(hash, { archive: true })) {
            this.push(buf);
        }
        this.push(null);
    }
    _read() {
        // empty
    }
}
function getDapp(dappId) {
    return (0, store_1.default)('main.dapps', dappId);
}
async function getDappColors(dappId) {
    const dapp = getDapp(dappId);
    const session = crypto_1.default.randomBytes(6).toString('hex');
    server_1.default.sessions.add(dapp.ens, session);
    const url = `http://${dapp.ens}.localhost:8421/?session=${session}`;
    try {
        const colors = await (0, extractColors_1.default)(url, dapp.ens);
        store_1.default.updateDapp(dappId, { colors });
        server_1.default.sessions.remove(dapp.ens, session);
    }
    catch (e) {
        electron_log_1.default.error(e);
    }
}
const createTarStream = (dappId) => {
    return tar_fs_1.default.extract((0, verify_1.getDappCacheDir)(), {
        map: (header) => ({ ...header, name: path_1.default.join(dappId, ...header.name.split('/').slice(1)) })
    });
};
const writeDapp = async (dappId, hash) => {
    return new Promise((resolve, reject) => {
        try {
            const dapp = new DappStream(hash);
            const tarStream = createTarStream(dappId);
            tarStream.on('error', reject);
            tarStream.on('finish', resolve);
            dapp.pipe(tarStream);
        }
        catch (e) {
            reject(e);
        }
    });
};
const cacheDapp = async (dappId, hash) => {
    await writeDapp(dappId, hash);
    await getDappColors(dappId);
    return dappId;
};
// TODO: change to correct manifest type one Nebula version with types are published
async function updateDappContent(dappId, manifest) {
    try {
        // Create a local cache of the content
        await cacheDapp(dappId, manifest.content);
        store_1.default.updateDapp(dappId, { content: manifest.content, manifest });
    }
    catch (e) {
        electron_log_1.default.error('error updating dapp cache', e);
    }
}
let retryTimer;
// Takes dappId and checks if the dapp is up to date
async function checkStatus(dappId) {
    clearTimeout(retryTimer);
    const dapp = (0, store_1.default)('main.dapps', dappId);
    const { checkStatusRetryCount, openWhenReady } = dapp;
    try {
        const { record, manifest } = await nebula.resolve(dapp.ens);
        const { version, content } = manifest || {};
        if (!content) {
            electron_log_1.default.error(`Attempted load dapp with id ${dappId} (${dapp.ens}) but manifest contained no content`, manifest);
            return;
        }
        electron_log_1.default.info(`Resolved content for ${dapp.ens}, version: ${version || 'unknown'}`);
        store_1.default.updateDapp(dappId, { record });
        const isDappCurrent = async () => {
            return (dapp.content === content && (await (0, verify_1.dappPathExists)(dappId)) && (await (0, verify_1.isDappVerified)(dappId, content)));
        };
        // Checks if all assets are up to date with current manifest
        if (!(await isDappCurrent())) {
            electron_log_1.default.info(`Updating content for dapp ${dappId} from hash ${content}`);
            // Sets status to 'updating' when updating the bundle
            store_1.default.updateDapp(dappId, { status: 'updating' });
            // Update dapp assets
            await updateDappContent(dappId, manifest);
        }
        else {
            electron_log_1.default.info(`Dapp ${dapp.ens} already up to date: ${content}`);
        }
        // Sets status to 'ready' when done
        store_1.default.updateDapp(dappId, { status: 'ready', openWhenReady: false });
        // The frame id 'dappLauncher' needs to refrence target frame
        if (openWhenReady)
            surface.open('dappLauncher', dapp.ens);
    }
    catch (e) {
        electron_log_1.default.error('Check status error', e);
        const retry = checkStatusRetryCount || 0;
        if (retry < 4) {
            retryTimer = setTimeout(() => {
                store_1.default.updateDapp(dappId, { status: 'initial', checkStatusRetryCount: retry + 1 });
            }, 1000);
        }
        else {
            store_1.default.updateDapp(dappId, { status: 'failed', checkStatusRetryCount: 0 });
        }
    }
}
const refreshDapps = ({ statusFilter = '' } = {}) => {
    const dapps = (0, store_1.default)('main.dapps');
    Object.keys(dapps || {})
        .filter((id) => !statusFilter || dapps[id].status === statusFilter)
        .forEach((id) => {
        store_1.default.updateDapp(id, { status: 'loading' });
        if (nebula.ready()) {
            checkStatus(id);
        }
        else {
            nebula.once('ready', () => checkStatus(id));
        }
    });
};
const checkNewDapps = () => refreshDapps({ statusFilter: 'initial' });
// Check all dapps on startup
refreshDapps();
// Check all dapps every hour
setInterval(() => refreshDapps(), 1000 * 60 * 60);
// Check any new dapps that are added
store_1.default.observer(checkNewDapps);
let nextId = 0;
const getId = () => (++nextId).toString();
const surface = {
    manifest: (_ens) => {
        // gets the dapp manifest and returns all options and details for user to confirm before installing
    },
    add: (dapp) => {
        const { ens, config } = dapp;
        const id = (0, eth_ens_namehash_1.hash)(ens);
        const status = 'initial';
        const existingDapp = (0, store_1.default)('main.dapps', id);
        // If ens name has not been installed, start install
        if (!existingDapp)
            store_1.default.appDapp({ id, ens, status, config, manifest: {}, current: {} });
    },
    addServerSession(_namehash /* , session */) {
        // server.sessions.add(namehash, session)
    },
    unsetCurrentView(frameId) {
        store_1.default.setCurrentFrameView(frameId, '');
    },
    open(frameId, ens) {
        const session = crypto_1.default.randomBytes(6).toString('hex');
        const dappId = (0, eth_ens_namehash_1.hash)(ens);
        const dapp = (0, store_1.default)('main.dapps', dappId);
        if (dapp.status === 'ready') {
            const url = `http://${ens}.localhost:8421/?session=${session}`;
            const view = {
                id: getId(),
                ready: false,
                dappId,
                ens,
                url
            };
            server_1.default.sessions.add(ens, session);
            if ((0, store_1.default)('main.frames', frameId)) {
                store_1.default.addFrameView(frameId, view);
            }
            else {
                electron_log_1.default.warn(`Attempted to open EvoTradeWallet "${frameId}" for ${ens} but EvoTradeWallet does not exist`);
            }
        }
        else {
            store_1.default.updateDapp(dappId, { ens, status: 'initial', openWhenReady: true });
        }
    }
};
exports.default = surface;
