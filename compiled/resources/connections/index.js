"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInvalidCustomTarget = exports.okPort = exports.okProtocol = void 0;
const validProtocols = ['ws://', 'wss://', 'http://', 'https://'];
function okProtocol(location) {
    if (location === 'injected')
        return true;
    if (location.endsWith('.ipc'))
        return true;
    const validProtocol = validProtocols.find((p) => location.startsWith(p));
    if (validProtocol) {
        const target = location.substring(validProtocol.length);
        // dont allow connections back to Frame
        return !!target && target !== 'localhost:1248' && target !== '127.0.0.1:1248';
    }
    return false;
}
exports.okProtocol = okProtocol;
function okPort(location) {
    const match = location.match(/^(?:https?|wss?).*:(?<port>\d{4,})/);
    if (match) {
        const portStr = (match.groups || { port: 0 }).port;
        const port = parseInt(portStr);
        return port >= 0 && port <= 65535;
    }
    return true;
}
exports.okPort = okPort;
// returns a (truthy) error message if invalid, otherwise will return false
function isInvalidCustomTarget(target) {
    if (!okProtocol(target))
        return 'invalid target';
    if (!okPort(target))
        return 'invalid port';
    return false;
}
exports.isInvalidCustomTarget = isInvalidCustomTarget;
