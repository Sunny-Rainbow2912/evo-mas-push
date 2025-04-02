"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const react_restore_1 = __importDefault(require("react-restore"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const link_1 = __importDefault(require("../../link"));
const Cluster_1 = require("../Cluster");
const svg_1 = __importDefault(require("../../svg"));
const utils_1 = require("../../utils");
function levelDisplay(level) {
    const gwei = (0, utils_1.weiToGwei)((0, utils_1.hexToInt)(level));
    return (0, utils_1.roundGwei)(gwei) || 0;
}
function toDisplayUSD(num) {
    if (!num || num === 0)
        return '?';
    return (0, bignumber_js_1.default)(num).toFixed(num >= 10 ? 0 : 2);
}
const GasFees = ({ gasPrice, color }) => (<div className='gasItem gasItemLarge'>
    <div className='gasGweiNum'>{gasPrice}</div>
    <span className='gasGweiLabel' style={{ color }}>
      {'GWEI'}
    </span>
    <span className='gasLevelLabel'>{'Recommended'}</span>
  </div>);
const GasFeesMarket = ({ gasPrice, fees: { nextBaseFee, maxPriorityFeePerGas }, color }) => {
    const [displayBaseHint, setDisplayBaseHint] = (0, react_1.useState)(false);
    const [displayPriorityHint, setDisplayPriorityHint] = (0, react_1.useState)(false);
    const calculatedFees = {
        actualBaseFee: (0, utils_1.roundGwei)((0, utils_1.weiToGwei)((0, utils_1.hexToInt)(nextBaseFee))),
        priorityFee: levelDisplay(maxPriorityFeePerGas)
    };
    return (<>
      {displayBaseHint && (<div className='feeToolTip feeToolTipBase cardShow'>
          The current base fee is added with a buffer to cover the next 3 blocks, any amount greater than your
          block&apos;s base fee is refunded
        </div>)}
      {displayPriorityHint && (<div className='feeToolTip feeToolTipPriority cardShow'>
          A priority tip paid to validators is added to incentivize quick inclusion of your transaction into a
          block
        </div>)}
      <div className='gasItem gasItemSmall'>
        <div className='gasGweiNum'>{calculatedFees.actualBaseFee || '‹0.001'}</div>
        <span className='gasGweiLabel' style={{ color }}>
          {'GWEI'}
        </span>
        <span className='gasLevelLabel'>{'Current Base'}</span>
      </div>
      <div className='gasItem gasItemLarge'>
        <div className='gasArrow' onClick={() => setDisplayBaseHint(true)} onMouseLeave={() => setDisplayBaseHint(false)}>
          <div className='gasArrowNotify'>+</div>
          <div className='gasArrowInner'>{svg_1.default.chevron(27)}</div>
        </div>
        <div className='gasGweiNum'>{gasPrice || '‹0.001'}</div>
        <span className='gasGweiLabel' style={{ color }}>
          {'GWEI'}
        </span>
        <span className='gasLevelLabel'>{'Recommended'}</span>
        <div className='gasArrow gasArrowRight' onClick={() => setDisplayPriorityHint(true)} onMouseLeave={() => setDisplayPriorityHint(false)}>
          <div className='gasArrowInner'>{svg_1.default.chevron(27)}</div>
        </div>
      </div>
      <div className='gasItem gasItemSmall'>
        <div className='gasGweiNum'>{calculatedFees.priorityFee || '‹0.001'}</div>
        <span className='gasGweiLabel' style={{ color }}>
          {'GWEI'}
        </span>
        <span className='gasLevelLabel'>{'Priority Tip'}</span>
      </div>
    </>);
};
class ChainSummaryComponent extends react_1.Component {
    constructor(...args) {
        super(...args);
        this.state = {
            expand: false
        };
    }
    render() {
        const { address, chainId } = this.props;
        const type = 'ethereum';
        const currentChain = { type, id: chainId };
        const fees = this.store('main.networksMeta', type, chainId, 'gas.price.fees');
        const levels = this.store('main.networksMeta', type, chainId, 'gas.price.levels');
        const gasPrice = levelDisplay(levels.fast);
        const explorer = this.store('main.networks', type, chainId, 'explorer');
        const sampleOperations = this.store('main.networksMeta', type, chainId, 'gas.samples') || [];
        // fees is either a populated object (EIP-1559 compatible) or falsy
        const displayFeeMarket = !!fees;
        const actualFee = displayFeeMarket
            ? (0, utils_1.roundGwei)((0, bignumber_js_1.default)(fees.maxPriorityFeePerGas).plus((0, bignumber_js_1.default)(fees.nextBaseFee)).shiftedBy(-9).toNumber())
            : gasPrice;
        return (<>
        <Cluster_1.ClusterRow>
          <Cluster_1.ClusterValue onClick={() => {
                this.setState({ expanded: !this.state.expanded });
            }}>
            <div className='sliceTileGasPrice'>
              <div className='sliceTileGasPriceIcon' style={{ color: this.props.color }}>
                {svg_1.default.gas(12)}
              </div>
              <div className='sliceTileGasPriceNumber'>{actualFee || '‹0.001'}</div>
              <div className='sliceTileGasPriceUnit'>{'gwei'}</div>
            </div>
          </Cluster_1.ClusterValue>
          <Cluster_1.ClusterValue style={{ minWidth: '70px', maxWidth: '70px' }} onClick={explorer
                ? () => {
                    if (address) {
                        link_1.default.send('tray:openExplorer', currentChain, null, address);
                    }
                    else {
                        link_1.default.rpc('openExplorer', currentChain, () => { });
                    }
                }
                : undefined}>
            <div style={{ padding: '6px', color: !explorer && 'var(--outerspace05)' }}>
              <div>{address ? svg_1.default.accounts(16) : svg_1.default.telescope(18)}</div>
            </div>
          </Cluster_1.ClusterValue>
        </Cluster_1.ClusterRow>
        {this.state.expanded && (<Cluster_1.ClusterRow>
            <Cluster_1.ClusterValue pointerEvents={true}>
              <div className='sliceGasBlock'>
                {displayFeeMarket ? (<GasFeesMarket gasPrice={gasPrice} fees={fees} color={this.props.color}/>) : (<GasFees gasPrice={gasPrice} color={this.props.color}/>)}
              </div>
            </Cluster_1.ClusterValue>
          </Cluster_1.ClusterRow>)}
        <Cluster_1.ClusterRow>
          {sampleOperations.map(({ label, estimates }, i) => {
                const cost = estimates.low?.cost.usd;
                return (<Cluster_1.ClusterValue key={i}>
                <div className='gasEstimate'>
                  <div className='gasEstimateRange'>
                    <span className='gasEstimateSymbol'>
                      {!cost || cost >= 0.01 || cost === '?' ? `$` : '<$'}
                    </span>
                    <span className='gasEstimateRangeLow'>{toDisplayUSD(cost)}</span>
                  </div>
                  <div className='gasEstimateLabel' style={{ color: this.props.color }}>
                    {label}
                  </div>
                </div>
              </Cluster_1.ClusterValue>);
            })}
        </Cluster_1.ClusterRow>
      </>);
    }
}
const Monitor = react_restore_1.default.connect(ChainSummaryComponent);
exports.default = react_restore_1.default.connect(Monitor);
