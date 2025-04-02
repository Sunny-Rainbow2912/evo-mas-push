"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const useFocusableRef = (focus, delay = 900) => {
    const ref = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (focus) {
            const timeout = setTimeout(() => ref.current && ref.current.focus(), delay);
            return () => clearTimeout(timeout);
        }
    });
    return ref;
};
exports.default = useFocusableRef;
