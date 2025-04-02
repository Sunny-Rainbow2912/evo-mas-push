"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapRequest = void 0;
const caipRequest_1 = __importDefault(require("./methods/caipRequest"));
const walletRequest_1 = __importDefault(require("./methods/walletRequest"));
function mapRequest(requestPayload) {
    if (requestPayload.method === 'caip_request') {
        return (0, caipRequest_1.default)(requestPayload);
    }
    if (requestPayload.method === 'wallet_request') {
        return (0, walletRequest_1.default)(requestPayload);
    }
    return requestPayload;
}
exports.mapRequest = mapRequest;
