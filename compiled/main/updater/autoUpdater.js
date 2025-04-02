"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_log_1 = __importDefault(require("electron-log"));
const events_1 = __importDefault(require("events"));
const electron_updater_1 = require("electron-updater");
const domain_1 = require("domain");
function createAppUpdater() {
    if (process.platform === 'win32') {
        return new electron_updater_1.NsisUpdater();
    }
    if (process.platform === 'darwin') {
        return new electron_updater_1.MacUpdater();
    }
    return new electron_updater_1.AppImageUpdater();
}
class AutoUpdater extends events_1.default {
    constructor() {
        super();
        // due to some bugs in the library, electron-updater can sometimes throw uncaught exceptions, so wrap these calls in a domain
        // in order to not interrupt the application execution and have Frame crash
        this.domain = (0, domain_1.create)();
        this.domain.on('error', (err) => {
            electron_log_1.default.error('Unhandled auto updater error', err);
            this.emit('error', err);
            this.close();
        });
        this.electronAutoUpdater = createAppUpdater();
        this.electronAutoUpdater.logger = electron_log_1.default;
        this.electronAutoUpdater.allowPrerelease = false;
        this.electronAutoUpdater.autoDownload = false;
        this.electronAutoUpdater.on('error', (err, message) => {
            this.emit('error', new Error(message || err.message || ''));
        });
        this.electronAutoUpdater.on('checking-for-update', () => {
            electron_log_1.default.verbose('Performing automatic check for updates', {
                allowPrerelease: this.electronAutoUpdater.allowPrerelease
            });
        });
        this.electronAutoUpdater.on('update-available', (res) => {
            electron_log_1.default.debug('Auto updater detected update available', { res });
            this.emit('update-available', { version: res.version, location: 'auto' });
        });
        this.electronAutoUpdater.on('update-not-available', (res) => {
            electron_log_1.default.debug('Auto updater detected update not available', { res });
            this.emit('update-not-available', res);
        });
        this.electronAutoUpdater.on('update-downloaded', (res) => {
            this.downloadCancellationToken?.dispose();
            this.downloadCancellationToken = undefined;
            electron_log_1.default.debug('Update downloaded', { res });
            this.emit('update-downloaded');
        });
    }
    close() {
        this.electronAutoUpdater.logger = null;
        this.electronAutoUpdater.removeAllListeners();
        this.cancelDownload();
        this.domain.exit();
        this.emit('exit');
        this.removeAllListeners();
    }
    async checkForUpdates() {
        this.domain.run(async () => {
            try {
                const result = await this.electronAutoUpdater.checkForUpdates();
                if (!result) {
                    this.electronAutoUpdater.emit('update-not-available', {
                        version: '',
                        files: [],
                        sha512: '',
                        path: '',
                        releaseDate: ''
                    });
                }
            }
            catch (e) {
                // in case of failure an error is emitted, but for some reason an exception is also thrown
                // so handle that promise rejection here
                electron_log_1.default.warn('Auto updater failed to check for updates', e);
            }
        });
    }
    async downloadUpdate() {
        this.domain.run(async () => {
            try {
                this.downloadCancellationToken = new electron_updater_1.CancellationToken();
                await this.electronAutoUpdater.downloadUpdate(this.downloadCancellationToken);
            }
            catch (e) {
                electron_log_1.default.warn('Auto updater failed to download update', e);
                this.cancelDownload();
            }
        });
    }
    async quitAndInstall() {
        this.electronAutoUpdater.quitAndInstall();
    }
    cancelDownload() {
        electron_log_1.default.debug('Auto update download cancel');
        if (this.downloadCancellationToken) {
            electron_log_1.default.verbose('Canceling auto update download');
            this.downloadCancellationToken.cancel();
            this.downloadCancellationToken.dispose();
            this.downloadCancellationToken = undefined;
        }
    }
}
exports.default = AutoUpdater;
