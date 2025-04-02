"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_restore_1 = __importDefault(require("react-restore"));
const state_1 = __importDefault(require("./state"));
const actions = __importStar(require("./actions"));
const persist_1 = __importDefault(require("./persist"));
// TODO: Layer persisted op top of initial state
// const get = (path, obj = persist.get('main')) => {
//   path.split('.').some((key, i) => {
//     if (typeof obj !== 'object') { obj = undefined } else { obj = obj[key] }
//     return obj === undefined // Stop navigating the path if we get to undefined value
//   })
//   return obj
// }
// const persistedPaths = []
// persistedPaths.forEach(path => {
//   const value = get(path)
//   if (value !== undefined) store.__overwrite(path, value)
// })
const store = react_restore_1.default.create((0, state_1.default)(), actions);
// Persist initial full state
persist_1.default.set('main', store('main'));
// Apply updates to persisted state
store.api.feed((state, actionBatch) => {
    actionBatch.forEach((action) => {
        action.updates.forEach((update) => {
            persist_1.default.queue(update.path, update.value);
        });
    });
});
exports.default = store;
