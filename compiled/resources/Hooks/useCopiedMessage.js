"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const link_1 = __importDefault(require("../link"));
const useCopiedMessage = (value) => {
    const [showMessage, setShowMessage] = (0, react_1.useState)(false);
    const copyToClipboard = () => {
        link_1.default.send('tray:clipboardData', value);
        setShowMessage(true);
        setTimeout(() => setShowMessage(false), 1000);
    };
    return [showMessage, copyToClipboard];
};
exports.default = useCopiedMessage;
