"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openFileDialog = exports.showUnhandledExceptionDialog = void 0;
const electron_1 = require("electron");
var ExitAction;
(function (ExitAction) {
    ExitAction[ExitAction["OK"] = 0] = "OK";
    ExitAction[ExitAction["Quit"] = 1] = "Quit";
})(ExitAction || (ExitAction = {}));
const showUnhandledExceptionDialog = (message, code) => {
    let exitAction = ExitAction.Quit;
    if (code === 'EADDRINUSE') {
        electron_1.dialog.showErrorBox('EvoTradeWallet is already running', 'EvoTradeWallet is already running or another application is using port 1248.');
    }
    else {
        exitAction = electron_1.dialog.showMessageBoxSync(undefined, {
            title: 'Unhandled Exception',
            message: 'An unexpected error occured',
            detail: message,
            type: 'error',
            buttons: Object.keys(ExitAction).slice(Object.keys(ExitAction).length / 2),
            defaultId: ExitAction.OK,
            cancelId: ExitAction.OK
        });
    }
    if (exitAction === ExitAction.OK) {
        electron_1.app.relaunch();
    }
    electron_1.app.quit();
};
exports.showUnhandledExceptionDialog = showUnhandledExceptionDialog;
const openFileDialog = async () => {
    const browserWindow = electron_1.BrowserWindow.getFocusedWindow();
    const file = await electron_1.dialog.showOpenDialog(browserWindow, { properties: ['openFile'] });
    return file;
};
exports.openFileDialog = openFileDialog;
