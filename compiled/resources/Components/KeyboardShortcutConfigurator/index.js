"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const hotkeys_js_1 = __importDefault(require("hotkeys-js"));
const link_1 = __importDefault(require("../../../resources/link"));
const keyboard_1 = require("../../keyboard");
const KeyboardShortcutConfigurator = ({ actionText = '', platform, shortcut, shortcutName }) => {
    const { modifierKeys, shortcutKey } = (0, keyboard_1.getDisplayShortcut)(platform, shortcut);
    const EnterShortcut = () => {
        (0, react_1.useEffect)(() => {
            (0, hotkeys_js_1.default)('*', { capture: true }, (event) => {
                event.preventDefault();
                const allowedModifierKeys = ['Meta', 'Alt', 'Control', 'Command'];
                const isModifierKey = allowedModifierKeys.includes(event.key);
                // ignore modifier key solo keypresses and disabled keys
                if (!isModifierKey && (0, keyboard_1.isShortcutKey)(event)) {
                    const newShortcut = (0, keyboard_1.getShortcutFromKeyEvent)(event, hotkeys_js_1.default.getPressedKeyCodes(), platform);
                    // enable the new shortcut
                    link_1.default.send('tray:action', 'setShortcut', shortcutName, {
                        ...newShortcut,
                        configuring: false,
                        enabled: true
                    });
                }
                return false;
            });
            return () => hotkeys_js_1.default.unbind();
        });
        const labelId = `shortcut-${shortcutName.toLowerCase()}-configure`;
        return (<div style={{ display: 'flex' }}>
        <label id={labelId}>Enter new keyboard shortcut!</label>
        <div className='loaderWrap'>
          <div className='loader'/>
        </div>
      </div>);
    };
    const DisplayShortcut = () => {
        const labelId = `shortcut-${shortcutName.toLowerCase()}-display`;
        return (<>
        <label id={labelId}>To {actionText} press</label>

        <span className='keyCommand' aria-labelledby={labelId}>
          {[...modifierKeys, shortcutKey].map((displayKey, index, displayKeys) => index === displayKeys.length - 1 ? (displayKey) : (<span key={index}>
                {displayKey}
                <span style={{ padding: '0px 3px' }}>+</span>
              </span>))}
        </span>
      </>);
    };
    return <span>{shortcut.configuring ? <EnterShortcut /> : <DisplayShortcut />}</span>;
};
exports.default = KeyboardShortcutConfigurator;
