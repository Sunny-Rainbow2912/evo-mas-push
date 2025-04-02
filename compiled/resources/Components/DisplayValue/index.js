"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisplayValue = exports.DisplayFiatPrice = exports.DisplayCoinBalance = void 0;
const displayValue_1 = require("../../utils/displayValue");
const constants_1 = require("../../constants");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
function isDisplayValueData(obj) {
    return obj?.fiat && obj?.ether && obj?.gwei && obj?.wei && bignumber_js_1.default.isBigNumber(obj.bn);
}
const ApproximateValue = ({ approximationSymbol }) => (<span className='displayValueApprox'>{approximationSymbol}</span>);
const FiatSymbol = ({ fiatSymbol }) => <span className='displayValueFiat'>{fiatSymbol}</span>;
const Symbol = ({ currencySymbol }) => (<span className='displayValueSymbol'>{currencySymbol.toUpperCase()}</span>);
const Main = ({ displayValue }) => <span className='displayValueMain'>{displayValue}</span>;
const Unit = ({ displayUnit }) => <span className='displayValueUnit'>{displayUnit.shortName}</span>;
const DisplayCoinBalance = ({ amount, symbol, decimals }) => (<exports.DisplayValue type='ether' value={amount} currencySymbol={symbol} currencySymbolPosition='last' valueDataParams={{ decimals }}/>);
exports.DisplayCoinBalance = DisplayCoinBalance;
const DisplayFiatPrice = ({ decimals, currencyRate, isTestnet }) => (<exports.DisplayValue type='fiat' value={`1e${decimals}`} valueDataParams={{ decimals, currencyRate, isTestnet, displayFullValue: true }} currencySymbol='$'/>);
exports.DisplayFiatPrice = DisplayFiatPrice;
const DisplayValue = (props) => {
    const { value, valueDataParams, currencySymbol, type = 'ether', displayDecimals = true, currencySymbolPosition = 'first' } = props;
    const data = isDisplayValueData(value) ? value : (0, displayValue_1.displayValueData)(value, valueDataParams);
    const { approximationSymbol = '', displayValue, displayUnit = '' } = value === constants_1.MAX_HEX ? { displayValue: 'Unlimited' } : data[type]({ displayDecimals });
    return (<div className='displayValue' data-testid='display-value'>
      {type === 'fiat' ? (<>
          {approximationSymbol && <ApproximateValue approximationSymbol={approximationSymbol}/>}
          {currencySymbol && <FiatSymbol fiatSymbol={currencySymbol}/>}
        </>) : (<>
          {currencySymbol && currencySymbolPosition === 'first' && <Symbol currencySymbol={currencySymbol}/>}
          {approximationSymbol && <ApproximateValue approximationSymbol={approximationSymbol}/>}
        </>)}
      <Main displayValue={displayValue}/>
      {displayUnit && <Unit displayUnit={displayUnit}/>}
      {currencySymbol && currencySymbolPosition === 'last' && <Symbol currencySymbol={currencySymbol}/>}
    </div>);
};
exports.DisplayValue = DisplayValue;
