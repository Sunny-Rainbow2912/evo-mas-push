"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = __importDefault(require("events"));
const electron_log_1 = __importDefault(require("electron-log"));
const adapter_1 = __importDefault(require("./ledger/adapter"));
const adapter_2 = __importDefault(require("./trezor/adapter"));
const adapter_3 = __importDefault(require("./lattice/adapter"));
const hot_1 = __importDefault(require("./hot"));
const store_1 = __importDefault(require("../store"));
const registeredAdapters = [new adapter_1.default(), new adapter_2.default(), new adapter_3.default()];
class Signers extends events_1.default {
    constructor() {
        super();
        this.signers = {};
        this.adapters = {};
        // TODO: convert these scans to adapters
        this.scans = {
            hot: hot_1.default.scan(this)
        };
        registeredAdapters.forEach(this.addAdapter.bind(this));
    }
    close() {
        registeredAdapters.forEach((a) => a.close());
    }
    addAdapter(adapter) {
        const addFn = this.add.bind(this);
        const removeFn = this.remove.bind(this);
        const updateFn = this.update.bind(this);
        adapter.on('add', addFn);
        adapter.on('remove', removeFn);
        adapter.on('update', updateFn);
        adapter.open();
        this.adapters[adapter.adapterType] = {
            adapter,
            listeners: [
                {
                    event: 'add',
                    handler: addFn
                },
                {
                    event: 'remove',
                    handler: removeFn
                },
                {
                    event: 'update',
                    handler: updateFn
                }
            ]
        };
    }
    removeAdapter(adapter) {
        const adapterSpec = this.adapters[adapter.adapterType];
        adapterSpec.listeners.forEach((listener) => {
            adapter.removeListener(listener.event, listener.handler);
        });
        delete this.adapters[adapter.adapterType];
    }
    exists(id) {
        return id in this.signers;
    }
    add(signer) {
        const id = signer.id;
        if (!(id in this.signers)) {
            this.signers[id] = signer;
            store_1.default.newSigner(signer.summary());
        }
    }
    remove(id) {
        const signer = this.signers[id];
        if (signer) {
            delete this.signers[id];
            store_1.default.removeSigner(id);
            store_1.default.navClearSigner(id);
            const type = signer.type === 'ring' || signer.type === 'seed' ? 'hot' : signer.type;
            if (type in this.adapters) {
                this.adapters[type].adapter.remove(signer);
            }
            else {
                // backwards compatibility
                signer.close();
                signer.delete();
            }
        }
    }
    update(signer) {
        const id = signer.id;
        if (id in this.signers) {
            this.signers[id] = signer;
            store_1.default.updateSigner(signer.summary());
        }
        else {
            this.add(signer);
        }
    }
    reload(id) {
        const signer = this.signers[id];
        if (signer) {
            const type = signer.type === 'ring' || signer.type === 'seed' ? 'hot' : signer.type;
            if (this.scans[type] && typeof this.scans[type] === 'function') {
                signer.close();
                delete this.signers[id];
                this.scans[type]();
            }
            else if (type in this.adapters) {
                this.adapters[type].adapter.reload(signer);
            }
        }
    }
    get(id) {
        return this.signers[id];
    }
    createFromPhrase(mnemonic, password, cb) {
        hot_1.default.createFromPhrase(this, mnemonic, password, cb);
    }
    createFromPrivateKey(privateKey, password, cb) {
        hot_1.default.createFromPrivateKey(this, privateKey, password, cb);
    }
    createFromKeystore(keystore, keystorePassword, password, cb) {
        hot_1.default.createFromKeystore(this, keystore, keystorePassword, password, cb);
    }
    addPrivateKey(id, privateKey, password, cb) {
        // Get signer
        const signer = this.get(id);
        // Make sure signer is of type 'ring'
        if (signer.type !== 'ring') {
            return cb(new Error('Private keys can only be added to ring signers'), undefined);
        }
        // Add private key
        ;
        signer.addPrivateKey(privateKey, password, cb);
    }
    removePrivateKey(id, index, password, cb) {
        // Get signer
        const signer = this.get(id);
        if (signer.type !== 'ring') {
            return cb(new Error('Private keys can only be removed from ring signers'), undefined);
        }
        // Add keystore
        ;
        signer.removePrivateKey(index, password, cb);
    }
    addKeystore(id, keystore, keystorePassword, password, cb) {
        // Get signer
        const signer = this.get(id);
        if (signer.type !== 'ring') {
            return cb(new Error('Keystores can only be used with ring signers'), undefined);
        }
        ;
        signer.addKeystore(keystore, keystorePassword, password, cb);
    }
    lock(id, cb) {
        const signer = this.get(id);
        // @ts-ignore
        if (signer && signer.lock) {
            ;
            signer.lock(cb);
        }
    }
    unlock(id, password, cb) {
        const signer = this.signers[id];
        // @ts-ignore
        if (signer && signer.unlock) {
            ;
            signer.unlock(password, cb);
        }
        else {
            electron_log_1.default.error('Signer not unlockable via password, no unlock method');
        }
    }
    unsetSigner() {
        electron_log_1.default.info('unsetSigner');
    }
}
exports.default = new Signers();
