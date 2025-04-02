"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Frames are the windows that run dapps and other functionality
// They are rendered based on the state of `main.frames`
const electron_log_1 = __importDefault(require("electron-log"));
const store_1 = __importDefault(require("../../store"));
const frameInstances_js_1 = __importDefault(require("./frameInstances.js"));
const viewInstances_1 = __importDefault(require("./viewInstances"));
function getFrames() {
    return (0, store_1.default)('main.frames');
}
class FrameManager {
    constructor() {
        this.frameInstances = {};
    }
    start() {
        store_1.default.observer(() => {
            const inFocus = (0, store_1.default)('main.focusedFrame');
            const frames = getFrames();
            this.manageFrames(frames, inFocus);
            this.manageViews(frames);
            // manageOverlays(frames)
        });
    }
    manageFrames(frames, inFocus) {
        const frameIds = Object.keys(frames);
        const instanceIds = Object.keys(this.frameInstances);
        // create an instance for each new frame in the store
        frameIds
            .filter((frameId) => !instanceIds.includes(frameId))
            .forEach((frameId) => {
            const frameInstance = frameInstances_js_1.default.create(frames[frameId]);
            this.frameInstances[frameId] = frameInstance;
            frameInstance.on('closed', () => {
                this.removeFrameInstance(frameId);
                store_1.default.removeFrame(frameId);
            });
            frameInstance.on('maximize', () => {
                store_1.default.updateFrame(frameId, { maximized: true });
            });
            frameInstance.on('unmaximize', () => {
                store_1.default.updateFrame(frameId, { maximized: false });
            });
            frameInstance.on('enter-full-screen', () => {
                store_1.default.updateFrame(frameId, { fullscreen: true });
            });
            frameInstance.on('leave-full-screen', () => {
                const platform = (0, store_1.default)('platform');
                // Handle broken linux window events
                if (platform !== 'win32' && platform !== 'darwin' && !frameInstance.isFullScreen()) {
                    if (frameInstance.isMaximized()) {
                        // Trigger views to reposition
                        setTimeout(() => {
                            const frame = frames[frameId];
                            viewInstances_1.default.position(frameInstance, frame.currentView);
                        }, 100);
                        store_1.default.updateFrame(frameId, { maximized: true });
                    }
                    else {
                        store_1.default.updateFrame(frameId, { maximized: false });
                    }
                }
                else {
                    store_1.default.updateFrame(frameId, { fullscreen: false });
                }
            });
            frameInstance.on('focus', () => {
                // Give focus to current view
                const { currentView } = frames[frameId];
                if (currentView && frameInstance) {
                    frameInstance.views = frameInstance.views || {};
                    frameInstance.views[currentView].webContents.focus();
                }
            });
        });
        // destroy each frame instance that is no longer in the store
        instanceIds
            .filter((instanceId) => !frameIds.includes(instanceId))
            .forEach((instanceId) => {
            const frameInstance = this.removeFrameInstance(instanceId);
            if (frameInstance) {
                frameInstance.destroy();
            }
        });
        if (inFocus) {
            const focusedFrame = this.frameInstances[inFocus] || { isFocused: () => true };
            if (!focusedFrame.isFocused()) {
                focusedFrame.show();
                focusedFrame.focus();
            }
        }
    }
    manageViews(frames) {
        const frameIds = Object.keys(frames);
        frameIds.forEach((frameId) => {
            const frameInstance = this.frameInstances[frameId];
            if (!frameInstance)
                return electron_log_1.default.error('Instance not found when managing views');
            const frame = frames[frameId];
            const frameInstanceViews = frameInstance.views || {};
            const frameViewIds = Object.keys(frame.views);
            const instanceViewIds = Object.keys(frameInstanceViews);
            instanceViewIds
                .filter((instanceViewId) => !frameViewIds.includes(instanceViewId))
                .forEach((instanceViewId) => viewInstances_1.default.destroy(frameInstance, instanceViewId));
            // For each view in the store that belongs to this frame
            frameViewIds.forEach((frameViewId) => {
                const viewData = frame.views[frameViewId] || {};
                const viewInstance = frameInstanceViews[frameViewId] || {};
                // Create them
                if (!instanceViewIds.includes(frameViewId))
                    viewInstances_1.default.create(frameInstance, viewData);
                // Show the correct one
                if (frame.currentView === frameViewId &&
                    viewData.ready &&
                    frameInstance.showingView !== frameViewId) {
                    frameInstance.addBrowserView(viewInstance);
                    frameInstance.showingView = frameViewId;
                    viewInstances_1.default.position(frameInstance, frameViewId);
                    setTimeout(() => {
                        if (frameInstance.isFocused())
                            viewInstance.webContents.focus();
                    }, 100);
                }
                else if (frame.currentView !== frameViewId && frameInstance.showingView === frameViewId) {
                    frameInstance.removeBrowserView(viewInstance);
                    frameInstance.showingView = '';
                }
            });
        });
    }
    removeFrameInstance(frameId) {
        const frameInstance = this.frameInstances[frameId];
        Object.keys(frameInstance.views || {}).forEach((viewId) => {
            viewInstances_1.default.destroy(frameInstance, viewId);
        });
        delete this.frameInstances[frameId];
        if (frameInstance) {
            frameInstance.removeAllListeners('closed');
        }
        return frameInstance;
    }
    sendMessageToFrame(frameId, channel, ...args) {
        const frameInstance = this.frameInstances[frameId];
        if (frameInstance && !frameInstance.isDestroyed()) {
            const webContents = frameInstance.webContents;
            webContents.send(channel, ...args);
        }
        else {
            electron_log_1.default.error(new Error(`Tried to send a message to EvoTradeWallet with id ${frameId} but it does not exist or has been destroyed`));
        }
    }
    broadcast(channel, args) {
        Object.keys(this.frameInstances).forEach((id) => this.sendMessageToFrame(id, channel, ...args));
    }
    reloadFrames() {
        Object.keys(this.frameInstances).forEach((win) => {
            this.frameInstances[win].webContents.reload();
        });
    }
    refocus(id) {
        const frameInstance = this.frameInstances[id];
        if (frameInstance) {
            frameInstance.setVisibleOnAllWorkspaces(true, {
                visibleOnFullScreen: true,
                skipTransformProcessType: true
            });
            frameInstance.setVisibleOnAllWorkspaces(false, {
                visibleOnFullScreen: true,
                skipTransformProcessType: true
            });
            frameInstance.show();
            frameInstance.focus();
        }
    }
    isFrameShowing() {
        return Object.keys(this.frameInstances).some((win) => this.frameInstances[win].isVisible());
    }
}
exports.default = FrameManager;
