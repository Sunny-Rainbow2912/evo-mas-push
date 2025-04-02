"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfirmPassword = exports.CreatePassword = exports.PasswordInput = void 0;
const react_1 = require("react");
const zxcvbn_1 = __importDefault(require("zxcvbn"));
const useFocusableRef_1 = __importDefault(require("../../Hooks/useFocusableRef"));
const utils_1 = require("../../utils");
const NO_PASSWORD_ENTERED = 'Enter password';
const PasswordInput = ({ getError: getInputError, next, title, buttonText, autofocus, lastStep = false }) => {
    const [error, setError] = (0, react_1.useState)(NO_PASSWORD_ENTERED);
    const inputRef = (0, useFocusableRef_1.default)(autofocus);
    const [disabled, setDisabled] = (0, react_1.useState)(false);
    const [processing, setProcessing] = (0, react_1.useState)(false);
    const resetError = () => setError(NO_PASSWORD_ENTERED);
    const clear = () => {
        inputRef.current && (inputRef.current.value = '');
    };
    const handleSubmit = () => {
        next(inputRef.current.value);
        if (lastStep) {
            setProcessing(true);
            clear();
        }
        else {
            setTimeout(() => {
                resetError();
                clear();
            }, 1000);
        }
    };
    const getError = () => inputRef.current.value ? getInputError(inputRef.current.value) || '' : NO_PASSWORD_ENTERED;
    const validateInput = () => {
        const err = getError();
        if (err) {
            setDisabled(true);
            return (0, utils_1.debounce)(() => {
                setDisabled(false);
                setError(getError());
            }, 300)();
        }
        return setError(err);
    };
    return (<div className='addAccountItemOptionSetupFrame'>
      <div role='heading' className='addAccountItemOptionTitle'>
        {title}
      </div>
      <div className='addAccountItemOptionInput addAccountItemOptionInputPassword'>
        <input role='textbox' type='password' tabIndex='-1' ref={inputRef} onChange={validateInput} onKeyDown={(e) => {
            if (!error && e.key === 'Enter' && !disabled)
                handleSubmit();
        }}/>
      </div>

      {error ? (<div role='button' className='addAccountItemOptionError'>
          {error}
        </div>) : processing ? (<div role='button' className='addAccountItemOptionProcessing'>
          Processing...
        </div>) : (<div role='button' className='addAccountItemOptionSubmit' onClick={() => !disabled && handleSubmit()}>
          {buttonText}
        </div>)}
    </div>);
};
exports.PasswordInput = PasswordInput;
const CreatePassword = ({ onCreate, autofocus }) => {
    const getError = (password) => {
        if (password.length < 12)
            return 'PASSWORD MUST BE 12 OR MORE CHARACTERS';
        const { feedback: { warning }, score } = (0, zxcvbn_1.default)(password);
        if (score > 2)
            return;
        return (warning || 'PLEASE ENTER A STRONGER PASSWORD').toUpperCase();
    };
    return (<exports.PasswordInput getError={getError} next={onCreate} title='Create Password' buttonText='Continue' autofocus={autofocus}/>);
};
exports.CreatePassword = CreatePassword;
const ConfirmPassword = ({ password, onConfirm, autofocus, lastStep }) => {
    const getError = (confirmedPassword) => {
        if (password !== confirmedPassword)
            return 'PASSWORDS DO NOT MATCH';
    };
    return (<exports.PasswordInput getError={getError} next={onConfirm} title='Confirm Password' buttonText='Create' autofocus={autofocus} lastStep={lastStep}/>);
};
exports.ConfirmPassword = ConfirmPassword;
