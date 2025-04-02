"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const electron_log_1 = __importDefault(require("electron-log"));
const store_1 = __importDefault(require("../../store"));
const server_1 = __importDefault(require("../../dapps/server"));
const window_1 = require("../window");
const extract = (l) => {
    const url = new url_1.URL(l);
    const session = url.searchParams.get('session') || '';
    const ens = url.port === '8421' ? url.hostname.replace('.localhost', '') || '' : '';
    return { session, ens };
};
exports.default = {
    // Create a view instance on a frame
    create: (frameInstance, view) => {
        const viewInstance = (0, window_1.createViewInstance)(view.ens);
        const { session } = extract(view.url);
        viewInstance.webContents.session.webRequest.onBeforeSendHeaders((details, cb) => {
            if (!details || !details.frame)
                return cb({ cancel: true }); // Reject the request\
            const appUrl = details.frame.url;
            if (
            // Initial request for app
            details.resourceType === 'mainFrame' &&
                details.url === view.url &&
                !appUrl) {
                return cb({ requestHeaders: details.requestHeaders }); // Leave untouched
            }
            else if (
            // devtools:// request
            details.url.startsWith('devtools://')) {
                return cb({ requestHeaders: details.requestHeaders }); // Leave untouched
            }
            else if (
            // Reqest from app
            appUrl === view.url) {
                const { ens, session } = extract(appUrl);
                if (ens !== view.ens || !server_1.default.sessions.verify(ens, session)) {
                    return cb({ cancel: true });
                }
                else {
                    details.requestHeaders['Origin'] = view.ens;
                    return cb({ requestHeaders: details.requestHeaders });
                }
            }
            else {
                return cb({ cancel: true }); // Reject the request
            }
        });
        const { fullscreen } = (0, store_1.default)('main.frames', frameInstance.frameId);
        const { width, height } = frameInstance.getBounds();
        frameInstance.addBrowserView(viewInstance);
        const dappBackground = (0, store_1.default)('main.dapps', view.dappId, 'colors', 'background');
        if (dappBackground)
            frameInstance.setBackgroundColor(dappBackground);
        viewInstance.setBounds({
            x: 0,
            y: fullscreen ? 0 : 32,
            width: width,
            height: fullscreen ? height : height - 32
        });
        viewInstance.setAutoResize({ width: true, height: true });
        viewInstance.webContents.setVisualZoomLevelLimits(1, 3);
        frameInstance.removeBrowserView(viewInstance);
        // viewInstance.webContents.openDevTools({ mode: 'detach' })
        viewInstance.webContents.session.cookies
            .set({
            url: view.url,
            name: '__frameSession',
            value: session
        })
            .then(() => {
            viewInstance.webContents.loadURL(view.url);
        }, (error) => electron_log_1.default.error(error));
        viewInstance.webContents.on('did-finish-load', () => {
            store_1.default.updateFrameView(frameInstance.frameId, view.id, { ready: true });
        });
        // Keep reference to view on frame instance
        frameInstance.views = { ...(frameInstance.views || {}), [view.id]: viewInstance };
    },
    // Destroy a view instance on a frame
    destroy: (frameInstance, viewId) => {
        const views = frameInstance.views || {};
        const { frameId } = frameInstance;
        const { url } = (0, store_1.default)('main.frames', frameId, 'views', viewId);
        const { ens, session } = extract(url);
        server_1.default.sessions.remove(ens, session);
        if (frameInstance && !frameInstance.isDestroyed())
            frameInstance.removeBrowserView(views[viewId]);
        const webcontents = views[viewId].webContents;
        webcontents.destroy();
        delete views[viewId];
    },
    position: (frameInstance, viewId) => {
        const { frameId } = frameInstance;
        const { fullscreen } = (0, store_1.default)('main.frames', frameId);
        const viewInstance = (frameInstance.views || {})[viewId];
        if (viewInstance) {
            const { width, height } = frameInstance.getBounds();
            viewInstance.setBounds({
                x: 0,
                y: fullscreen ? 0 : 32,
                width: width,
                height: fullscreen ? height : height - 32
            });
            // viewInstance.setBounds({ x: 73, y: 16, width: width - 73, height: height - 16 })
            viewInstance.setAutoResize({ width: true, height: true });
        }
    }
};
