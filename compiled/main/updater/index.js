"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_log_1 = __importDefault(require("electron-log"));
const store_1 = __importDefault(require("../store"));
const window_1 = require("../windows/window");
const autoUpdater_1 = __importDefault(require("./autoUpdater"));
const manualCheck_1 = __importDefault(require("./manualCheck"));
const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';
const UPDATE_INTERVAL = parseInt(process.env.UPDATE_INTERVAL || '') || 60 * 60000;
const useAutoUpdater = isMac || isWindows;
class Updater {
    constructor() {
        // this will only be set if an upgrade-eligible version is found
        this.availableUpdate = '';
        this.availableVersion = '';
        this.installerReady = false;
        this.notified = {};
    }
    start() {
        electron_log_1.default.verbose('Starting updater', { useAutoUpdater });
        this.stopUpdates();
        const check = useAutoUpdater ? () => this.checkForAutoUpdate() : () => this.checkForManualUpdate();
        this.setupCheck = setTimeout(() => {
            check();
            this.pendingCheck = setInterval(check, UPDATE_INTERVAL);
        }, 10000);
    }
    stop() {
        electron_log_1.default.verbose('Stopping updater');
        this.stopUpdates();
    }
    get updateReady() {
        return this.installerReady;
    }
    fetchUpdate() {
        if (this.availableUpdate === 'auto') {
            if (!this.autoUpdater) {
                electron_log_1.default.warn(`update ${this.availableVersion} is asking to be downloaded but autoUpdater is not running!`);
                return;
            }
            electron_log_1.default.info(`Downloading update for version ${this.availableVersion}`);
            this.autoUpdater.downloadUpdate();
        }
        else if (this.availableUpdate.startsWith('https')) {
            electron_log_1.default.verbose(`Opening release page for version ${this.availableVersion}`);
            (0, window_1.openExternal)(this.availableUpdate);
        }
    }
    quitAndInstall() {
        if (this.installerReady) {
            if (!this.autoUpdater) {
                electron_log_1.default.warn(`update ${this.availableVersion} is asking to be installed but autoUpdater is not running!`);
                return;
            }
            electron_log_1.default.info(`Quitting, will install ${this.availableVersion} on restart`);
            this.autoUpdater.quitAndInstall();
        }
    }
    dismissUpdate() {
        electron_log_1.default.verbose('Dismissed update', { version: this.availableVersion });
        this.availableUpdate = '';
        this.availableVersion = '';
    }
    stopUpdates() {
        if (this.setupCheck) {
            clearTimeout(this.setupCheck);
            this.setupCheck = undefined;
        }
        if (this.pendingCheck) {
            clearInterval(this.pendingCheck);
            this.pendingCheck = undefined;
        }
        if (this.autoUpdater) {
            this.autoUpdater.close();
            this.autoUpdater = undefined;
        }
    }
    updateAvailable(version, location) {
        electron_log_1.default.verbose('Found available update', {
            version,
            location,
            alreadyNotified: this.notified[version] || false
        });
        if (!this.notified[version]) {
            // a newer version is available
            this.availableVersion = version;
            this.availableUpdate = location;
            const remindOk = !(0, store_1.default)('main.updater.dontRemind').includes(version);
            if (remindOk) {
                store_1.default.updateBadge('updateAvailable', this.availableVersion);
            }
            else {
                electron_log_1.default.verbose(`Update to version ${version} is available but user chose to skip`);
            }
            this.notified[version] = true;
        }
    }
    // an update has been downloaded and is ready to be installed
    readyForInstall() {
        this.installerReady = true;
        store_1.default.updateBadge('updateReady');
    }
    checkForAutoUpdate() {
        electron_log_1.default.debug('Doing automatic check for app update');
        const switchToManualUpdate = () => {
            this.dismissUpdate();
            this.checkForManualUpdate();
        };
        if (!this.autoUpdater) {
            this.autoUpdater = new autoUpdater_1.default();
            this.autoUpdater.on('update-available', (update) => {
                const { version, location } = update;
                electron_log_1.default.info('Auto check found available update', { version, location });
                this.updateAvailable(version, location);
            });
            this.autoUpdater.on('update-not-available', () => {
                electron_log_1.default.info('No available updates found by auto check, checking manually');
                switchToManualUpdate();
            });
            this.autoUpdater.on('update-downloaded', () => {
                electron_log_1.default.info('Auto check update downloaded and ready for install');
                if (!this.installerReady)
                    this.readyForInstall();
            });
            this.autoUpdater.on('error', (err) => {
                this.installerReady = false;
                electron_log_1.default.warn('Error auto checking for update, checking manually', err);
                switchToManualUpdate();
            });
            this.autoUpdater.on('exit', () => {
                electron_log_1.default.verbose('Auto updater exited');
                this.autoUpdater = undefined;
            });
        }
        this.autoUpdater.checkForUpdates();
    }
    async checkForManualUpdate() {
        electron_log_1.default.debug('Checking for app update manually');
        try {
            const update = await (0, manualCheck_1.default)({ prereleaseTrack: false });
            if (!update) {
                electron_log_1.default.info('Manual check found no updates');
            }
            else {
                const { version, location } = update;
                electron_log_1.default.debug('Manual check found available update', { version, location });
                this.updateAvailable(version, location);
            }
        }
        catch (e) {
            electron_log_1.default.error('Error performing manual check for updates', e);
        }
    }
}
exports.default = new Updater();
