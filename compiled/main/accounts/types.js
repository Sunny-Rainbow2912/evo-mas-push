"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TxClassification = exports.RequestStatus = exports.RequestMode = exports.ReplacementType = void 0;
var ReplacementType;
(function (ReplacementType) {
    ReplacementType["Speed"] = "speed";
    ReplacementType["Cancel"] = "cancel";
})(ReplacementType = exports.ReplacementType || (exports.ReplacementType = {}));
var RequestMode;
(function (RequestMode) {
    RequestMode["Normal"] = "normal";
    RequestMode["Monitor"] = "monitor";
})(RequestMode = exports.RequestMode || (exports.RequestMode = {}));
var RequestStatus;
(function (RequestStatus) {
    RequestStatus["Pending"] = "pending";
    RequestStatus["Sending"] = "sending";
    RequestStatus["Verifying"] = "verifying";
    RequestStatus["Confirming"] = "confirming";
    RequestStatus["Confirmed"] = "confirmed";
    RequestStatus["Sent"] = "sent";
    RequestStatus["Declined"] = "declined";
    RequestStatus["Error"] = "error";
    RequestStatus["Success"] = "success";
})(RequestStatus = exports.RequestStatus || (exports.RequestStatus = {}));
var TxClassification;
(function (TxClassification) {
    TxClassification["CONTRACT_DEPLOY"] = "CONTRACT_DEPLOY";
    TxClassification["CONTRACT_CALL"] = "CONTRACT_CALL";
    TxClassification["SEND_DATA"] = "SEND_DATA";
    TxClassification["NATIVE_TRANSFER"] = "NATIVE_TRANSFER";
})(TxClassification = exports.TxClassification || (exports.TxClassification = {}));
