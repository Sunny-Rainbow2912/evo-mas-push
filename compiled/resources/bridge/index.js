"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const rpc_1 = __importDefault(require("./rpc"));
const unwrap = (v) => (v !== undefined || v !== null ? JSON.parse(v) : v);
const wrap = (v) => (v !== undefined || v !== null ? JSON.stringify(v) : v);
const source = 'bridge:link';
const safeOrigins = ['file://'].concat(process.env.NODE_ENV === 'development' ? ['http://localhost:1234'] : []);
window.addEventListener('message', (e) => {
    if (!safeOrigins.includes(e.origin) || e.data.source?.includes('react-devtools'))
        return;
    const data = unwrap(e.data);
    if (data.source !== source) {
        if (data.method === 'rpc') {
            return (0, rpc_1.default)(...data.args, (...args) => e.source.postMessage(wrap({ method: 'rpc', id: data.id, args, source }), e.origin));
        }
        if (data.method === 'event')
            return electron_1.ipcRenderer.send(...data.args);
        if (data.method === 'invoke') {
            ;
            (async () => {
                const args = await electron_1.ipcRenderer.invoke(...data.args);
                window.postMessage(wrap({ method: 'invoke', channel: 'action', id: data.id, args, source }), '*');
            })();
        }
    }
}, false);
electron_1.ipcRenderer.on('main:action', (...args) => {
    args.shift();
    window.postMessage(wrap({ method: 'event', channel: 'action', args, source }), '*');
});
electron_1.ipcRenderer.on('main:flex', (...args) => {
    args.shift();
    window.postMessage(wrap({ method: 'event', channel: 'flex', args, source }), '*');
});
electron_1.ipcRenderer.on('main:dapp', (...args) => {
    args.shift();
    window.postMessage(wrap({ method: 'event', channel: 'dapp', args, source }), '*');
});
