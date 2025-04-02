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
exports.init = void 0;
const Sentry = __importStar(require("@sentry/electron"));
const store_1 = __importDefault(require("../store"));
const EVENT_RATE_LIMIT = 5;
function getCrashReportFields() {
    const fields = ['networks', 'networksMeta', 'tokens'];
    return fields.reduce((extra, field) => ({ ...extra, [field]: JSON.stringify((0, store_1.default)('main', field) || {}) }), {});
}
function sanitizeStackFrame({ module = '' }) {
    const matches = /(.+)[\\|/]frame[\\|/]resources[\\|/]app.asar[\\|/](.+)/.exec(module);
    if (matches && matches[2]) {
        return `{asar}/${matches[2].replaceAll('\\', '/')}`;
    }
    return module;
}
function getSentryExceptions(event) {
    const exceptions = event?.exception?.values || [];
    const safeExceptions = exceptions.map((exception) => {
        const frames = exception?.stacktrace?.frames || [];
        const safeFrames = frames.map((frame) => ({ ...frame, module: sanitizeStackFrame(frame) }));
        return { ...exception, stacktrace: { frames: safeFrames } };
    });
    return safeExceptions;
}
function init() {
    let allowedEvents = EVENT_RATE_LIMIT;
    const backOffRateLimitBy = (numEventsToAllow) => {
        allowedEvents = Math.min(EVENT_RATE_LIMIT, allowedEvents + numEventsToAllow);
    };
    const filterEvent = () => {
        return allowedEvents <= 0 || !(0, store_1.default)('main.privacy.errorReporting');
    };
    setInterval(() => backOffRateLimitBy(1), 60000);
    Sentry.init({
        // only use IPC from renderer process, not HTTP
        ipcMode: Sentry.IPCMode.Classic,
        dsn: 'https://7b09a85b26924609bef5882387e2c4dc@o1204372.ingest.sentry.io/6331069',
        beforeSend: (event) => {
            if (filterEvent())
                return null;
            allowedEvents--;
            return {
                ...event,
                exception: { values: getSentryExceptions(event) },
                user: { ...event.user, ip_address: undefined },
                tags: { ...event.tags, 'frame.instance_id': (0, store_1.default)('main.instanceId') },
                extra: getCrashReportFields()
            };
        }
    });
}
exports.init = init;
