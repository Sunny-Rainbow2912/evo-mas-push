"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = __importDefault(require("electron"));
const path_1 = __importDefault(require("path"));
const window_1 = require("../window");
const topRight_1 = __importDefault(require("./topRight"));
const isDev = process.env.NODE_ENV === 'development';
const place = (frameInstance) => {
    const area = electron_1.default.screen.getDisplayNearestPoint(electron_1.default.screen.getCursorScreenPoint()).workArea;
    const height = area.height - 160;
    const maxWidth = Math.floor(height * 1.24);
    const targetWidth = area.width - 460;
    const width = targetWidth > maxWidth ? maxWidth : targetWidth;
    frameInstance.setMinimumSize(400, 300);
    frameInstance.setSize(width, height);
    const pos = (0, topRight_1.default)(frameInstance);
    frameInstance.setPosition(pos.x - 440, pos.y + 80);
};
exports.default = {
    reposition: (frameInstance) => {
        place(frameInstance);
    },
    create: (frame) => {
        const frameInstance = (0, window_1.createWindow)('frameInstance', {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            titleBarStyle: 'hidden',
            trafficLightPosition: { x: 10, y: 9 },
            icon: path_1.default.join(__dirname, './AppIcon.png')
        });
        frameInstance.loadURL(isDev ? 'http://localhost:1234/dapp/index.dev.html' : `file://${process.env.BUNDLE_LOCATION}/dapp.html`);
        frameInstance.on('ready-to-show', () => {
            frameInstance.show();
        });
        frameInstance.showingView = '';
        frameInstance.frameId = frame.id;
        frameInstance.views = {};
        place(frameInstance);
        return frameInstance;
    }
};
