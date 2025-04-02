"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
function ConfirmDialog({ prompt, acceptText = 'OK', declineText = 'Decline', onAccept, onDecline }) {
    const [submitted, setSubmitted] = (0, react_1.useState)(false);
    const clickHandler = (evt, onClick) => {
        if (evt.button === 0 && !submitted) {
            setSubmitted(true);
            onClick();
        }
    };
    const ResponseButton = ({ text, onClick }) => {
        return (<div role='button' className='confirmButton' onClick={(evt) => clickHandler(evt, onClick)}>
        {text}
      </div>);
    };
    return (<div id='confirmationDialog' className='confirmDialog'>
      <div role='heading' className='confirmText'>
        {prompt}
      </div>

      <div className='confirmButtonOptions'>
        <ResponseButton text={declineText} onClick={onDecline}/>
        <ResponseButton text={acceptText} onClick={onAccept}/>
      </div>
    </div>);
}
exports.default = ConfirmDialog;
