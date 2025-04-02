"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_log_1 = __importDefault(require("electron-log"));
const https_1 = __importDefault(require("https"));
const semver_1 = __importDefault(require("semver"));
const package_json_1 = __importDefault(require("../../package.json"));
const repo = package_json_1.default.repository.split(':')[1];
const version = package_json_1.default.version;
const httpOptions = {
    host: 'api.github.com',
    path: `/repos/${repo}/releases`,
    headers: { 'User-Agent': 'request' }
};
function parseResponse(rawData) {
    try {
        return JSON.parse(rawData);
    }
    catch (e) {
        electron_log_1.default.warn('Manual check for update returned invalid JSON response', e);
        return [];
    }
}
function compareVersions(a, b) {
    if (semver_1.default.gt(a, b))
        return 1;
    if (semver_1.default.lt(a, b))
        return -1;
    return 0;
}
function default_1(opts) {
    electron_log_1.default.verbose('Performing manual check for updates', { prereleaseTrack: opts?.prereleaseTrack });
    return new Promise((resolve, reject) => {
        https_1.default
            .get(httpOptions, (res) => {
            let rawData = '';
            res.on('error', (e) => {
                electron_log_1.default.warn('Manual check for update encountered HTTP error', e);
                reject(e);
            });
            res.on('data', (chunk) => {
                rawData += chunk;
            });
            res.on('end', () => {
                const contentType = res.headers['content-type'] || '';
                electron_log_1.default.debug('Manual check response', { status: res.statusCode, contentType });
                if (res.statusCode != 200 || !contentType.includes('json')) {
                    electron_log_1.default.warn('Manual check for update returned invalid response', {
                        status: res.statusCode,
                        contentType,
                        data: rawData
                    });
                    return reject(new Error(`invalid response, status: ${res.statusCode} contentType: ${contentType}`));
                }
                const releases = parseResponse(rawData).filter((r) => !r.prerelease || opts?.prereleaseTrack) || [];
                const latestRelease = releases[0] || { tag_name: '' };
                if (latestRelease.tag_name) {
                    const latestVersion = latestRelease.tag_name.charAt(0) === 'v'
                        ? latestRelease.tag_name.substring(1)
                        : latestRelease.tag_name;
                    const isNewerVersion = compareVersions(latestVersion, version) === 1;
                    electron_log_1.default.verbose('Manual check found release', {
                        currentVersion: version,
                        latestVersion,
                        isNewerVersion
                    });
                    resolve(isNewerVersion
                        ? { version: latestRelease.tag_name, location: latestRelease.html_url }
                        : undefined);
                }
                else {
                    electron_log_1.default.verbose('Manual check did not find any releases');
                    reject(new Error('no releases found'));
                }
            });
        })
            .on('error', reject);
    });
}
exports.default = default_1;
