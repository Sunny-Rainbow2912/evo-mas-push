"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const useCountdown_1 = __importDefault(require("../../Hooks/useCountdown"));
const Countdown = ({ end, title, titleClass, innerClass }) => {
    const ttl = (0, useCountdown_1.default)(end);
    return (<div className={titleClass}>
      <div>{title}</div>
      <div className={innerClass} role='timer'>
        {ttl}
      </div>
    </div>);
};
exports.default = Countdown;
