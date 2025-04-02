"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_restore_1 = __importDefault(require("react-restore"));
const Monitor_1 = __importDefault(require("../Monitor"));
class _Aux extends react_1.default.Component {
    render() {
        const { data } = this.store('panel.nav')[0] || {};
        const aux = (data && data.aux) || {};
        if (aux.type === 'gas') {
            return (<div className='auxWrap cardShow'>
          <Monitor_1.default id={1}/>
        </div>);
        }
        else {
            return null;
        }
    }
}
exports.default = react_restore_1.default.connect(_Aux);
