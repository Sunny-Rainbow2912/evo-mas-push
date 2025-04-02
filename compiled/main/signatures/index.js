"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSignatureRequest = exports.identify = void 0;
const types_1 = __importDefault(require("./types"));
const matchesMsgType = (properties, required) => properties.length === required.length &&
    required.every(({ name, type }) => Boolean(properties.find((item) => item.name === name && item.type === type)));
const matchesMessage = (message, required) => required.every(({ name }) => message[name] !== undefined);
const matchesDomainFilter = (domain, domainFilter) => domainFilter.every((property) => property in domain);
const identify = ({ data }) => {
    const identified = Object.entries(types_1.default).find(([, { domainFilter, types: requiredTypes }]) => {
        if (!('types' in data && 'message' in data))
            return;
        return Object.entries(requiredTypes).every(([name, properties]) => data.types[name] &&
            matchesMsgType(data.types[name], properties) &&
            matchesMessage(data.message, properties) &&
            matchesDomainFilter(data.domain, domainFilter));
    });
    return identified ? identified[0] : 'signTypedData';
};
exports.identify = identify;
var request_1 = require("../../resources/domain/request");
Object.defineProperty(exports, "isSignatureRequest", { enumerable: true, get: function () { return request_1.isSignatureRequest; } });
