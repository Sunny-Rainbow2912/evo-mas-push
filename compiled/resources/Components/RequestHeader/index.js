"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RequestHeader = ({ chain, children, chainColor }) => (<div className='_txDescriptionSummary'>
    {children}
    <div className='_txDescriptionSummaryTag' style={{ color: `var(--${chainColor})` }}>
      {`on ${chain}`}
    </div>
  </div>);
exports.default = RequestHeader;
