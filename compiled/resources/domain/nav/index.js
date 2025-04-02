"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountPanelCrumb = exports.signerPanelCrumb = void 0;
function signerPanelCrumb({ id }) {
    return { view: 'expandedSigner', data: { signer: id } };
}
exports.signerPanelCrumb = signerPanelCrumb;
function accountPanelCrumb() {
    return { view: 'accounts', data: {} };
}
exports.accountPanelCrumb = accountPanelCrumb;
