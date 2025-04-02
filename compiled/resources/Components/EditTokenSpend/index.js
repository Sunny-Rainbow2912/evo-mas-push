"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const numbers_1 = require("../../utils/numbers");
const svg_1 = __importDefault(require("../../svg"));
const Cluster_1 = require("../Cluster");
const Countdown_1 = __importDefault(require("../Countdown"));
const useCopiedMessage_1 = __importDefault(require("../../Hooks/useCopiedMessage"));
const isMax = (value) => numbers_1.max.isEqualTo(value);
const getMode = (requestedAmount, amount) => {
    if (requestedAmount.eq(amount))
        return 'requested';
    return isMax(amount) ? 'unlimited' : 'custom';
};
const isValidInput = (value, decimals) => {
    const strValue = value.toString();
    return !isNaN(value) && value > 0 && (!strValue.includes('.') || strValue.split('.')[1].length <= decimals);
};
const Details = ({ address, name }) => {
    const [showCopiedMessage, copyAddress] = (0, useCopiedMessage_1.default)(address);
    return (<Cluster_1.ClusterRow>
      <Cluster_1.ClusterValue pointerEvents={'auto'} onClick={() => {
            copyAddress();
        }}>
        <div className='clusterAddress'>
          <span className='clusterAddressRecipient'>
            {name ? (<span className='clusterAddressRecipient' style={{ fontFamily: 'MainFont', fontWeight: '400' }}>
                {name}
              </span>) : (<>
                {address.substring(0, 8)}
                {svg_1.default.octicon('kebab-horizontal', { height: 15 })}
                {address.substring(address.length - 6)}
              </>)}
          </span>
          <div className='clusterAddressRecipientFull'>
            {showCopiedMessage ? (<span>{'Address Copied'}</span>) : (<span className='clusterFira'>{address}</span>)}
          </div>
        </div>
      </Cluster_1.ClusterValue>
    </Cluster_1.ClusterRow>);
};
const Description = ({ isRevoke }) => (<Cluster_1.ClusterRow>
    <Cluster_1.ClusterValue>
      <div className='clusterTag' style={{ color: 'var(--moon)' }}>
        {isRevoke ? <span>{'revoke approval to spend'}</span> : <span>{'grant approval to spend'}</span>}
      </div>
    </Cluster_1.ClusterValue>
  </Cluster_1.ClusterRow>);
const EditTokenSpend = ({ data, updateRequest: updateHandlerRequest, requestedAmount, deadline, canRevoke = false }) => {
    const { decimals = 0, symbol = '???', name = 'Unknown Token', spender, contract, amount } = data;
    const toDecimal = (baseAmount) => new bignumber_js_1.default(baseAmount).shiftedBy(-1 * decimals).toString(10);
    const fromDecimal = (decimalAmount) => new bignumber_js_1.default(decimalAmount).shiftedBy(decimals).toString(10);
    const [mode, setMode] = (0, react_1.useState)(getMode(requestedAmount, amount));
    const [custom, setCustom] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        setCustom(toDecimal(amount));
    }, []);
    const value = new bignumber_js_1.default(amount);
    const updateCustomAmount = (value, decimals) => {
        if (!value) {
            setCustom('0');
            return setMode('custom');
        }
        if (!isValidInput(value, decimals))
            return;
        setMode('custom');
        setCustom(value);
    };
    const resetToRequestAmount = () => {
        setCustom(toDecimal(requestedAmount));
        setMode('requested');
        updateHandlerRequest(requestedAmount.toString(10));
    };
    const setToMax = () => {
        setMode('unlimited');
        updateHandlerRequest(numbers_1.max.toString(10));
    };
    const isRevoke = canRevoke && value.eq(0);
    const isCustom = mode === 'custom';
    const displayAmount = isMax(amount) ? 'unlimited' : toDecimal(amount);
    const inputLock = !data.symbol || !data.name || !data.decimals;
    return (<div className='updateTokenApproval'>
      <Cluster_1.ClusterBox title={'token approval details'} style={{ marginTop: '64px' }}>
        <Cluster_1.Cluster>
          <Details {...{
        address: spender.address,
        name: spender.ens
    }}/>
          <Description {...{
        isRevoke,
        mode,
        custom
    }}/>
          <Details {...{
        address: contract.address,
        name
    }}/>
          {deadline && (<Cluster_1.ClusterRow>
              <Cluster_1.ClusterValue>
                <Countdown_1.default end={deadline} title={'Permission Expires in'} innerClass='clusterFocusHighlight' titleClass='clusterFocus'/>
              </Cluster_1.ClusterValue>
            </Cluster_1.ClusterRow>)}
        </Cluster_1.Cluster>

        <Cluster_1.Cluster style={{ marginTop: '16px' }}>
          <Cluster_1.ClusterRow>
            <Cluster_1.ClusterValue>
              <div className='approveTokenSpendAmountLabel'>{symbol}</div>
            </Cluster_1.ClusterValue>
          </Cluster_1.ClusterRow>
          <Cluster_1.ClusterRow>
            <Cluster_1.ClusterValue transparent={true} pointerEvents={'auto'}>
              <div className='approveTokenSpendAmount'>
                {isCustom && amount !== fromDecimal(custom) ? (<div className='approveTokenSpendAmountSubmit' role='button' onClick={() => custom === '' ? resetToRequestAmount() : updateHandlerRequest(fromDecimal(custom))}>
                    {'update'}
                  </div>) : (<div key={mode + amount} className='approveTokenSpendAmountSubmit' style={{ color: 'var(--good)' }}>
                    {svg_1.default.check(20)}
                  </div>)}
                {mode === 'custom' ? (<input autoFocus type='text' aria-label='Custom Amount' value={custom} onChange={(e) => {
                e.preventDefault();
                e.stopPropagation();
                updateCustomAmount(e.target.value, decimals);
            }} onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.target.blur();
                    if (custom === '')
                        return resetToRequestAmount();
                    updateHandlerRequest(fromDecimal(custom));
                }
            }}/>) : (<div className='approveTokenSpendAmountNoInput' role='textbox' style={inputLock ? { cursor: 'default' } : null} onClick={inputLock
                ? null
                : () => {
                    setCustom('');
                    setMode('custom');
                }}>
                    {displayAmount}
                  </div>)}
              </div>
            </Cluster_1.ClusterValue>
          </Cluster_1.ClusterRow>
          <Cluster_1.ClusterRow>
            <Cluster_1.ClusterValue transparent={true}>
              <div className='approveTokenSpendAmountSubtitle'>Set Token Approval Spend Limit</div>
            </Cluster_1.ClusterValue>
          </Cluster_1.ClusterRow>
          <Cluster_1.ClusterRow>
            <Cluster_1.ClusterValue onClick={() => resetToRequestAmount()}>
              <div className='clusterTag' style={mode === 'requested' ? { color: 'var(--good)' } : {}} role='button'>
                {'Requested'}
              </div>
            </Cluster_1.ClusterValue>
          </Cluster_1.ClusterRow>
          <Cluster_1.ClusterRow>
            <Cluster_1.ClusterValue onClick={() => {
            setToMax();
        }}>
              <div className='clusterTag' style={mode === 'unlimited' ? { color: 'var(--good)' } : {}} role='button'>
                {'Unlimited'}
              </div>
            </Cluster_1.ClusterValue>
          </Cluster_1.ClusterRow>
          {!inputLock && (<Cluster_1.ClusterRow>
              <Cluster_1.ClusterValue onClick={() => {
                setMode('custom');
                setCustom('');
            }}>
                <div className={'clusterTag'} style={isCustom ? { color: 'var(--good)' } : {}} role='button'>
                  Custom
                </div>
              </Cluster_1.ClusterValue>
            </Cluster_1.ClusterRow>)}
        </Cluster_1.Cluster>
      </Cluster_1.ClusterBox>
    </div>);
};
exports.default = EditTokenSpend;
