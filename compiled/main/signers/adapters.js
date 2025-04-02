"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignerAdapter = void 0;
const stream_1 = require("stream");
class SignerAdapter extends stream_1.EventEmitter {
    constructor(type) {
        super();
        this.adapterType = type;
    }
    open() { }
    close() { }
    remove(signer) { }
    reload(signer) { }
}
exports.SignerAdapter = SignerAdapter;
