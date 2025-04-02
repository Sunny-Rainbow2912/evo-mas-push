"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sessions = {};
const timers = {};
exports.default = {
    add: (app, session) => {
        app = app.replaceAll('.', '-');
        sessions[app] = sessions[app] || [];
        sessions[app].push(session);
    },
    verify: (app, session) => {
        app = app.replaceAll('.', '-');
        clearTimeout(timers[session]);
        return sessions[app] && sessions[app].indexOf(session) > -1;
    },
    remove: (app, session) => {
        app = app.replaceAll('.', '-');
        sessions[app].splice(sessions[app].indexOf(session), 1);
        if (sessions[app].length === 0)
            delete sessions[app];
    }
};
