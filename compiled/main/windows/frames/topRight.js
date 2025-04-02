"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = __importDefault(require("electron"));
exports.default = (window) => {
    const area = electron_1.default.screen.getDisplayNearestPoint(electron_1.default.screen.getCursorScreenPoint()).workArea;
    const screenSize = area;
    const windowSize = window.getSize();
    return {
        x: Math.floor(screenSize.x + screenSize.width - windowSize[0]),
        y: screenSize.y
    };
};
