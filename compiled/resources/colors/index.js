"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DARK = exports.LIGHT = exports.Colorway = exports.getColor = void 0;
const util_1 = require("@ethereumjs/util");
const light = {
    accent1: { r: 0, g: 170, b: 120 },
    accent2: { r: 255, g: 153, b: 51 },
    accent3: { r: 255, g: 0, b: 174 },
    accent4: { r: 246, g: 36, b: 35 },
    accent5: { r: 90, g: 181, b: 178 },
    accent6: { r: 140, g: 97, b: 232 },
    accent7: { r: 62, g: 173, b: 241 },
    accent8: { r: 60, g: 40, b: 234 }
};
exports.LIGHT = light;
const dark = {
    accent1: { r: 0, g: 210, b: 190 },
    accent2: { r: 255, g: 153, b: 51 },
    accent3: { r: 255, g: 0, b: 174 },
    accent4: { r: 246, g: 36, b: 35 },
    accent5: { r: 90, g: 181, b: 178 },
    accent6: { r: 140, g: 97, b: 232 },
    accent7: { r: 62, g: 173, b: 241 },
    accent8: { r: 60, g: 40, b: 234 }
};
exports.DARK = dark;
const colorways = { light, dark };
function toHex(color) {
    return (0, util_1.padToEven)(color.toString(16));
}
function getColor(key, colorway) {
    const color = colorways[colorway][key];
    return { ...color, hex: `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}` };
}
exports.getColor = getColor;
var Colorway;
(function (Colorway) {
    Colorway["light"] = "light";
    Colorway["dark"] = "dark";
})(Colorway = exports.Colorway || (exports.Colorway = {}));
