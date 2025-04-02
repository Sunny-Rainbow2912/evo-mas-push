"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Accounts = exports.RequestMode = void 0;
const events_1 = __importDefault(require("events"));
const electron_log_1 = __importDefault(require("electron-log"));
const electron_1 = require("electron");
const util_1 = require("@ethereumjs/util");
const uuid_1 = require("uuid");
const provider_1 = __importDefault(require("../provider"));
const store_1 = __importDefault(require("../store"));
const Account_1 = __importDefault(require("./Account"));
const externalData_1 = __importDefault(require("../externalData"));
const transaction_1 = require("../transaction");
const utils_1 = require("../../resources/utils");
const nav_1 = require("../../resources/domain/nav");
const transaction_2 = require("../../resources/domain/transaction");
const signer_1 = require("../../resources/domain/signer");
const types_1 = require("./types");
const window_1 = require("../windows/window");
const account_1 = require("../../resources/domain/account");
const chains_1 = require("../../resources/utils/chains");
function notify(title, body, action) {
    const notification = new electron_1.Notification({ title, body });
    notification.on('click', action);
    setTimeout(() => notification.show(), 1000);
}
function toTransactionsByLayer(requests, chainId) {
    return Object.entries(requests)
        .filter(([_, req]) => req.type === 'transaction')
        .reduce(({ l1Transactions, l2Transactions }, [id, req]) => {
        const txRequest = req;
        if (!txRequest.locked &&
            !txRequest.feesUpdatedByUser &&
            txRequest.data.gasFeesSource === transaction_2.GasFeesSource.Frame &&
            (!chainId || parseInt(txRequest.data.chainId, 16) === chainId)) {
            l1Transactions.push([id, txRequest]);
        }
        if ((0, chains_1.chainUsesOptimismFees)(parseInt(txRequest.data.chainId, 16))) {
            l2Transactions.push([id, txRequest]);
        }
        return { l1Transactions, l2Transactions };
    }, { l1Transactions: [], l2Transactions: [] });
}
const frameOriginId = (0, uuid_1.v5)('frame-internal', uuid_1.v5.DNS);
const storeApi = {
    getAccounts: function () {
        return ((0, store_1.default)('main.accounts') || {});
    },
    getAccount: function (id) {
        return ((0, store_1.default)('main.accounts', id) || {});
    },
    getSigners: function () {
        return Object.values(((0, store_1.default)('main.signers') || {}));
    }
};
var types_2 = require("./types");
Object.defineProperty(exports, "RequestMode", { enumerable: true, get: function () { return types_2.RequestMode; } });
class Accounts extends events_1.default {
    constructor() {
        super();
        this.accounts = Object.entries(storeApi.getAccounts()).reduce((accounts, [id, account]) => {
            accounts[id] = new Account_1.default(JSON.parse(JSON.stringify(account)), this);
            return accounts;
        }, {});
        this._current = Object.values(this.accounts).find((acct) => acct.active)?.id || '';
        this.dataScanner = (0, externalData_1.default)();
    }
    get(id) {
        return this.accounts[id] && this.accounts[id].summary();
    }
    getTransactionRequest(account, id) {
        return account.getRequest(id);
    }
    async add(address, name = '', options = {}, cb = () => { }) {
        if (!address)
            return cb(new Error('No address, will not add account'));
        address = address.toLowerCase();
        let account = (0, store_1.default)('main.accounts', address);
        if (!account) {
            electron_log_1.default.info(`Account ${address} not found, creating account`);
            const created = 'new:' + Date.now();
            const accountMetaId = (0, uuid_1.v5)(address, account_1.accountNS);
            const accountMeta = (0, store_1.default)('main.accountsMeta', accountMetaId) || { name };
            this.accounts[address] = new Account_1.default({ address, name: accountMeta.name, created, options, active: false }, this);
            account = this.accounts[address];
        }
        return cb(null, account);
    }
    rename(id, name) {
        this.accounts[id].rename(name);
        const account = this.accounts[id].summary();
        this.update(account);
    }
    update(account) {
        if (!this.accounts || this.accounts[account.id]) {
            store_1.default.updateAccount(account);
        }
    }
    current() {
        return this._current ? this.accounts[this._current] : null;
    }
    updateNonce(reqId, nonce) {
        electron_log_1.default.info('Update Nonce: ', reqId, nonce);
        const currentAccount = this.current();
        if (currentAccount) {
            const txRequest = this.getTransactionRequest(currentAccount, reqId);
            txRequest.data.nonce = nonce;
            currentAccount.update();
            return txRequest;
        }
    }
    confirmRequestApproval(reqId, approvalType, approvalData) {
        electron_log_1.default.info('confirmRequestApproval', reqId, approvalType);
        const currentAccount = this.current();
        if (currentAccount && currentAccount.requests[reqId]) {
            const txRequest = this.getTransactionRequest(currentAccount, reqId);
            const approval = (txRequest.approvals || []).find((a) => a.type === approvalType);
            if (approval) {
                approval.approve(approvalData);
            }
        }
    }
    // TODO: can we make this typed for the action type?
    updateRequest(reqId, data, actionId) {
        electron_log_1.default.verbose('updateRequest', { reqId, actionId, data });
        const currentAccount = this.current();
        const request = currentAccount?.getRequest(reqId);
        if (!currentAccount || !request)
            return;
        if (request.type === 'transaction') {
            if (!actionId)
                return;
            const transactionReq = request;
            const action = (transactionReq.recognizedActions || []).find((a) => a.id === actionId);
            if (!action?.update)
                return;
            action?.update(transactionReq, data);
        }
        if (request.type === 'signErc20Permit') {
            const permitReq = request;
            const reqData = data;
            Object.assign(permitReq, reqData);
        }
        currentAccount.update();
    }
    async replaceTx(id, type) {
        const currentAccount = this.current();
        return new Promise((resolve, reject) => {
            if (!currentAccount || !currentAccount.requests[id])
                return reject(new Error('Could not find request'));
            if (currentAccount.requests[id].type !== 'transaction')
                return reject(new Error('Request is not transaction'));
            const txRequest = this.getTransactionRequest(currentAccount, id);
            const data = JSON.parse(JSON.stringify(txRequest.data));
            const targetChain = { type: 'ethereum', id: parseInt(data.chainId, 16) };
            const { levels } = (0, store_1.default)('main.networksMeta', targetChain.type, targetChain.id, 'gas.price');
            // Set the gas default to asap
            store_1.default.setGasDefault(targetChain.type, targetChain.id, 'asap', levels.asap);
            const params = type === types_1.ReplacementType.Speed
                ? [data]
                : [
                    {
                        from: currentAccount.getSelectedAddress(),
                        to: currentAccount.getSelectedAddress(),
                        value: '0x0',
                        nonce: data.nonce,
                        chainId: (0, util_1.addHexPrefix)(targetChain.id.toString(16))
                    }
                ];
            const _origin = type === types_1.ReplacementType.Speed ? currentAccount.requests[id].origin : frameOriginId;
            const tx = {
                id: 1,
                jsonrpc: '2.0',
                method: 'eth_sendTransaction',
                chainId: (0, util_1.addHexPrefix)(targetChain.id.toString(16)),
                params,
                _origin
            };
            this.sendRequest(tx, (res) => {
                if (res.error)
                    return reject(new Error(res.error.message));
                resolve();
            });
        });
    }
    sendRequest({ method, params, chainId, _origin = frameOriginId }, cb) {
        provider_1.default.send({ id: 1, jsonrpc: '2.0', method, params, chainId, _origin }, cb);
    }
    async confirmations(account, id, hash, targetChain) {
        return new Promise((resolve, reject) => {
            // TODO: Route to account even if it's not current
            if (!account)
                return reject(new Error('Unable to determine target account'));
            if (!targetChain || !targetChain.type || !targetChain.id)
                return reject(new Error('Unable to determine target chain'));
            const targetChainId = (0, util_1.addHexPrefix)(targetChain.id.toString(16));
            this.sendRequest({ method: 'eth_blockNumber', params: [], chainId: targetChainId }, (res) => {
                if (res.error)
                    return reject(new Error(JSON.stringify(res.error)));
                this.sendRequest({ method: 'eth_getTransactionReceipt', params: [hash], chainId: targetChainId }, (receiptRes) => {
                    if (receiptRes.error)
                        return reject(receiptRes.error);
                    if (!this.accounts[account.address])
                        return reject(new Error('account closed'));
                    if (receiptRes.result && account.requests[id]) {
                        const txRequest = this.getTransactionRequest(account, id);
                        txRequest.tx = {
                            ...txRequest.tx,
                            receipt: receiptRes.result,
                            confirmations: txRequest.tx?.confirmations || 0
                        };
                        account.update();
                        if (!txRequest.feeAtTime) {
                            const network = targetChain;
                            if (network.type === 'ethereum' && network.id === 1) {
                                const ethPrice = (0, store_1.default)('main.networksMeta.ethereum.1.nativeCurrency.usd.price');
                                if (ethPrice && txRequest.tx && txRequest.tx.receipt && this.accounts[account.address]) {
                                    const { gasUsed } = txRequest.tx.receipt;
                                    txRequest.feeAtTime = (Math.round((0, utils_1.weiIntToEthInt)((0, utils_1.hexToInt)(gasUsed) * (0, utils_1.hexToInt)(txRequest.data.gasPrice || '0x0') * res.result.ethusd) * 100) / 100).toFixed(2);
                                    account.update();
                                }
                            }
                            else {
                                txRequest.feeAtTime = '?';
                                account.update();
                            }
                        }
                        if (receiptRes.result.status === '0x1' && txRequest.status === types_1.RequestStatus.Verifying) {
                            txRequest.status = types_1.RequestStatus.Confirming;
                            txRequest.notice = 'Confirming';
                            txRequest.completed = Date.now();
                            const hash = txRequest.tx.hash || '';
                            const h = hash.substring(0, 6) + '...' + hash.substring(hash.length - 4);
                            const body = `Transaction ${h} successful! \n Click for details`;
                            // Drop any other pending txs with same nonce
                            Object.keys(account.requests).forEach((k) => {
                                const txReq = this.getTransactionRequest(account, k);
                                if (txReq.status === types_1.RequestStatus.Verifying &&
                                    txReq.data.nonce === account.requests[id].data.nonce) {
                                    txReq.status = types_1.RequestStatus.Error;
                                    txReq.notice = 'Dropped';
                                    setTimeout(() => this.accounts[account.address] && this.removeRequest(account, k), 8000);
                                }
                            });
                            // If Frame is hidden, trigger native notification
                            notify('Transaction Successful', body, () => {
                                (0, window_1.openBlockExplorer)(targetChain, hash);
                            });
                        }
                        const blockHeight = parseInt(res.result, 16);
                        const receiptBlock = parseInt(txRequest.tx.receipt.blockNumber, 16);
                        resolve(blockHeight - receiptBlock);
                    }
                });
            });
        });
    }
    async txMonitor(account, requestId, hash) {
        if (!account)
            return electron_log_1.default.error('txMonitor had no target account');
        const txRequest = this.getTransactionRequest(account, requestId);
        const rawTx = txRequest.data;
        txRequest.tx = { hash, confirmations: 0 };
        account.update();
        const isChainAvailable = (status) => !['disconnected', 'degraded'].includes(status.toLowerCase());
        const setTxSent = () => {
            txRequest.status = types_1.RequestStatus.Sent;
            txRequest.notice = 'Sent';
            if (txRequest.tx)
                txRequest.tx.confirmations = 0;
            account.update();
        };
        if (!rawTx.chainId) {
            electron_log_1.default.error('txMonitor had no target chain');
            setTimeout(() => this.accounts[account.address] && this.removeRequest(account, requestId), 8 * 1000);
        }
        else {
            const targetChain = {
                type: 'ethereum',
                id: parseInt(rawTx.chainId, 16)
            };
            const targetChainId = (0, util_1.addHexPrefix)(targetChain.id.toString(16));
            this.sendRequest({ method: 'eth_subscribe', params: ['newHeads'], chainId: targetChainId }, (newHeadRes) => {
                if (newHeadRes.error) {
                    electron_log_1.default.warn(newHeadRes.error);
                    const monitor = async () => {
                        if (!this.accounts[account.address]) {
                            clearTimeout(monitorTimer);
                            return electron_log_1.default.error('txMonitor internal monitor had no target account');
                        }
                        let confirmations;
                        try {
                            confirmations = await this.confirmations(account, requestId, hash, targetChain);
                            txRequest.tx = { ...txRequest.tx, confirmations };
                            account.update();
                            if (confirmations > 12) {
                                txRequest.status = types_1.RequestStatus.Confirmed;
                                txRequest.notice = 'Confirmed';
                                account.update();
                                setTimeout(() => this.accounts[account.address] && this.removeRequest(account, requestId), 8000);
                                clear();
                            }
                        }
                        catch (e) {
                            electron_log_1.default.error('error awaiting confirmations', e);
                            clear();
                            setTxSent();
                            setTimeout(() => this.accounts[account.address] && this.removeRequest(account, requestId), 60 * 1000);
                            return;
                        }
                    };
                    setTimeout(() => monitor(), 3000);
                    const monitorTimer = setInterval(monitor, 15000);
                    const statusHandler = (status) => {
                        if (!isChainAvailable(status)) {
                            setTxSent();
                            clear();
                        }
                    };
                    const { type, id } = targetChain;
                    provider_1.default.on(`status:${type}:${id}`, statusHandler);
                    const clear = () => {
                        clearInterval(monitorTimer);
                        provider_1.default.off(`status:${type}:${id}`, statusHandler);
                    };
                }
                else if (newHeadRes.result) {
                    const headSub = newHeadRes.result;
                    const removeSubscription = async (requestRemoveTimeout) => {
                        setTimeout(() => this.accounts[account.address] && this.removeRequest(account, requestId), requestRemoveTimeout);
                        provider_1.default.off(`data:${targetChain.type}:${targetChain.id}`, handler);
                        provider_1.default.off(`status:${targetChain.type}:${targetChain.id}`, statusHandler);
                        this.sendRequest({ method: 'eth_unsubscribe', chainId: targetChainId, params: [headSub] }, (res) => {
                            if (res.error) {
                                electron_log_1.default.error('error sending message eth_unsubscribe', res);
                            }
                        });
                    };
                    const statusHandler = (status) => {
                        if (!isChainAvailable(status)) {
                            setTxSent();
                            removeSubscription(60 * 1000);
                        }
                    };
                    const handler = async (payload) => {
                        if (payload.method === 'eth_subscription' && payload.params.subscription === headSub) {
                            // const newHead = payload.params.result
                            let confirmations;
                            try {
                                confirmations = await this.confirmations(account, requestId, hash, targetChain);
                            }
                            catch (e) {
                                electron_log_1.default.error(e);
                                setTxSent();
                                return removeSubscription(60 * 1000);
                            }
                            txRequest.tx = { ...txRequest.tx, confirmations };
                            account.update();
                            if (confirmations > 12) {
                                txRequest.status = types_1.RequestStatus.Confirmed;
                                txRequest.notice = 'Confirmed';
                                account.update();
                                removeSubscription(8000);
                            }
                        }
                    };
                    const { type, id } = targetChain;
                    provider_1.default.on(`status:${type}:${id}`, statusHandler);
                    provider_1.default.on(`data:${type}:${id}`, handler);
                }
            });
        }
    }
    // Set Current Account
    setSigner(id, cb) {
        const previouslyActiveAccount = this.current();
        this._current = id;
        const currentAccount = this.current();
        if (!currentAccount) {
            const err = new Error('could not set signer');
            electron_log_1.default.error(`no current account with id: ${id}`, err.stack);
            return cb(err);
        }
        currentAccount.active = true;
        currentAccount.update();
        const summary = currentAccount.summary();
        cb(null, summary);
        if (previouslyActiveAccount && previouslyActiveAccount.address !== currentAccount.address) {
            previouslyActiveAccount.active = false;
            previouslyActiveAccount.update();
        }
        store_1.default.setAccount(summary);
        if (currentAccount.status === 'ok')
            this.verifyAddress(false, (err, verified) => {
                if (!err && !verified) {
                    currentAccount.signer = '';
                    currentAccount.update();
                }
            });
        // If the account has any current requests, make sure fees are current
        this.updatePendingFees();
    }
    updatePendingFees(chainId) {
        const currentAccount = this.current();
        if (currentAccount) {
            // If chainId, update pending tx requests from that chain, otherwise update all pending tx requests
            const { l1Transactions, l2Transactions } = toTransactionsByLayer(currentAccount.requests, chainId);
            l1Transactions.forEach(([id, req]) => {
                try {
                    const tx = req.data;
                    const chain = { type: 'ethereum', id: parseInt(tx.chainId, 16) };
                    const gas = (0, store_1.default)('main.networksMeta', chain.type, chain.id, 'gas');
                    if ((0, transaction_2.usesBaseFee)(tx)) {
                        const { maxBaseFeePerGas, maxPriorityFeePerGas } = gas.price.fees;
                        this.setPriorityFee(maxPriorityFeePerGas, id, false);
                        this.setBaseFee(maxBaseFeePerGas, id, false);
                    }
                    else {
                        const gasPrice = gas.price.levels.fast;
                        this.setGasPrice(gasPrice, id, false);
                    }
                }
                catch (e) {
                    electron_log_1.default.error('Could not update gas fees for transaction', e);
                }
            });
            if (chainId === 1) {
                l2Transactions.forEach(async ([_id, req]) => {
                    let estimate = '';
                    try {
                        estimate = (await provider_1.default.getL1GasCost(req.data)).toHexString();
                    }
                    catch (e) {
                        electron_log_1.default.error('Error estimating L1 gas cost', e);
                    }
                    req.chainData = {
                        ...req.chainData,
                        optimism: {
                            l1Fees: estimate
                        }
                    };
                    currentAccount.update();
                });
            }
        }
    }
    unsetSigner(cb) {
        const summary = { id: '', status: '' };
        if (cb)
            cb(null, summary);
        store_1.default.unsetAccount();
        // setTimeout(() => { // Clear signer requests when unset
        //   if (s) {
        //     s.requests = {}
        //     s.update()
        //   }
        // })
    }
    verifyAddress(display, cb) {
        const currentAccount = this.current();
        if (currentAccount && currentAccount.verifyAddress)
            currentAccount.verifyAddress(display, cb);
    }
    getSelectedAddresses() {
        const currentAccount = this.current();
        return currentAccount ? currentAccount.getSelectedAddresses() : [];
    }
    getAccounts(cb) {
        const currentAccount = this.current();
        if (!currentAccount) {
            if (cb)
                cb(new Error('No Account Selected'));
            return;
        }
        return currentAccount.getAccounts(cb);
    }
    getCoinbase(cb) {
        const currentAccount = this.current();
        if (!currentAccount)
            return cb(new Error('No Account Selected'));
        currentAccount.getCoinbase(cb);
    }
    signMessage(address, message, cb) {
        const currentAccount = this.current();
        if (!currentAccount)
            return cb(new Error('No Account Selected'));
        if (address.toLowerCase() !== currentAccount.getSelectedAddress().toLowerCase())
            return cb(new Error('signMessage: Wrong Account Selected'));
        currentAccount.signMessage(message, cb);
    }
    signTypedData(address, typedMessage, cb) {
        const currentAccount = this.current();
        if (!currentAccount)
            return cb(new Error('No Account Selected'));
        if (address.toLowerCase() !== currentAccount.getSelectedAddress().toLowerCase())
            return cb(new Error('signMessage: Wrong Account Selected'));
        currentAccount.signTypedData(typedMessage, cb);
    }
    signTransaction(rawTx, cb) {
        const currentAccount = this.current();
        if (!currentAccount)
            return cb(new Error('No Account Selected'));
        const matchSelected = (rawTx.from || '').toLowerCase() === currentAccount.getSelectedAddress().toLowerCase();
        if (matchSelected) {
            currentAccount.signTransaction(rawTx, cb);
        }
        else {
            cb(new Error('signMessage: Account does not match currently selected'));
        }
    }
    signerCompatibility(handlerId, cb) {
        const currentAccount = this.current();
        if (!currentAccount)
            return cb(new Error('Could not locate account'));
        const request = currentAccount.requests[handlerId];
        if (!request)
            return cb(new Error(`Could not locate request ${handlerId}`));
        const signer = currentAccount.getSigner();
        const signerUnavailable = (knownSigner) => {
            const crumb = knownSigner ? (0, nav_1.signerPanelCrumb)(knownSigner) : (0, nav_1.accountPanelCrumb)();
            store_1.default.navDash(crumb);
            return cb(new Error('Signer unavailable'));
        };
        if (!signer) {
            // if no signer is active, check if this account was previously relying on a
            // hardware signer that is currently disconnected
            const unavailableSigners = (0, signer_1.findUnavailableSigners)(currentAccount.lastSignerType, storeApi.getSigners());
            // if there is only one matching disconnected signer, open the signer panel so it can be unlocked
            if (unavailableSigners.length === 1)
                return signerUnavailable(unavailableSigners[0]);
            // if there is more than one matching signer, open the account panel so the user can choose
            if (unavailableSigners.length > 1)
                return signerUnavailable();
            // otherwise there are no signers that can be found
            return cb(new Error('No signer'));
        }
        if (!(0, signer_1.isSignerReady)(signer)) {
            // if the signer is not ready to sign, open the signer panel so that
            // the user can unlock it or reconnect
            return signerUnavailable(signer);
        }
        const getCompatibility = () => {
            if (request.type === 'transaction') {
                const data = this.getTransactionRequest(currentAccount, handlerId).data;
                return (0, transaction_1.signerCompatibility)(data, signer.summary());
            }
            // all requests besides transactions are always compatible
            return { signer: signer.type, tx: '', compatible: true };
        };
        cb(null, getCompatibility());
    }
    close() {
        this.dataScanner.close();
        // usbDetect.stopMonitoring()
    }
    setAccess(req, access) {
        const currentAccount = this.current();
        if (currentAccount) {
            currentAccount.setAccess(req, access);
        }
    }
    resolveRequest(req, result) {
        const currentAccount = this.current();
        if (currentAccount && currentAccount.resolveRequest) {
            currentAccount.resolveRequest(req, result);
        }
    }
    rejectRequest(req, error) {
        const currentAccount = this.current();
        if (currentAccount) {
            currentAccount.rejectRequest(req, error);
        }
    }
    addRequest(req, res) {
        electron_log_1.default.info('addRequest', JSON.stringify(req));
        const currentAccount = this.current();
        if (currentAccount && !currentAccount.requests[req.handlerId]) {
            currentAccount.addRequest(req, res);
        }
    }
    removeRequests(handlerId) {
        Object.values(this.accounts).forEach((account) => {
            if (account.requests[handlerId]) {
                this.removeRequest(account, handlerId);
            }
        });
    }
    removeRequest(account, handlerId) {
        electron_log_1.default.info(`removeRequest(${account.id}, ${handlerId})`);
        account.clearRequest(handlerId);
    }
    declineRequest(handlerId) {
        const currentAccount = this.current();
        if (currentAccount && currentAccount.requests[handlerId]) {
            const txRequest = this.getTransactionRequest(currentAccount, handlerId);
            txRequest.status = types_1.RequestStatus.Declined;
            txRequest.notice = 'Signature Declined';
            txRequest.mode = types_1.RequestMode.Monitor;
            setTimeout(() => this.accounts[currentAccount.address] && this.removeRequest(currentAccount, handlerId), 2000);
            currentAccount.update();
        }
    }
    setRequestPending(req) {
        const handlerId = req.handlerId;
        const currentAccount = this.current();
        electron_log_1.default.info('setRequestPending', handlerId);
        if (currentAccount && currentAccount.requests[handlerId]) {
            currentAccount.requests[handlerId].status = types_1.RequestStatus.Pending;
            const signerType = currentAccount.lastSignerType;
            const hwSigner = signerType !== 'seed' && signerType !== 'ring';
            currentAccount.requests[handlerId].notice = hwSigner ? 'See Signer' : '';
            currentAccount.update();
        }
    }
    setRequestError(handlerId, err) {
        electron_log_1.default.info('setRequestError', handlerId);
        const currentAccount = this.current();
        if (currentAccount && currentAccount.requests[handlerId]) {
            currentAccount.requests[handlerId].status = types_1.RequestStatus.Error;
            const errorMessage = (err.message || '').toLowerCase();
            if (errorMessage === 'ledger device: invalid data received (0x6a80)') {
                currentAccount.requests[handlerId].notice = 'Ledger Contract Data = No';
            }
            else if (err.message === 'ledger device: condition of use not satisfied (denied by the user?) (0x6985)') {
                currentAccount.requests[handlerId].notice = 'Ledger Signature Declined';
            }
            else if (errorMessage.includes('insufficient funds')) {
                currentAccount.requests[handlerId].notice = errorMessage.includes('for gas')
                    ? 'insufficient funds for gas'
                    : 'insufficient funds';
            }
            else {
                const notice = err && typeof err === 'string'
                    ? err
                    : err && typeof err === 'object' && err.message && typeof err.message === 'string'
                        ? err.message
                        : 'Unknown Error'; // TODO: Update to normalize input type
                currentAccount.requests[handlerId].notice = notice;
            }
            if (currentAccount.requests[handlerId].type === 'transaction') {
                setTimeout(() => {
                    const activeAccount = this.current();
                    if (activeAccount && activeAccount.requests[handlerId]) {
                        activeAccount.requests[handlerId].mode = types_1.RequestMode.Monitor;
                        activeAccount.update();
                        setTimeout(() => this.accounts[activeAccount.address] && this.removeRequest(activeAccount, handlerId), 8000);
                    }
                }, 1500);
            }
            else {
                setTimeout(() => this.accounts[currentAccount.address] && this.removeRequest(currentAccount, handlerId), 3300);
            }
            currentAccount.update();
        }
    }
    setTxSigned(handlerId, cb) {
        electron_log_1.default.info('setTxSigned', handlerId);
        const currentAccount = this.current();
        if (!currentAccount)
            return cb(new Error('No account selected'));
        if (currentAccount.requests[handlerId]) {
            if (currentAccount.requests[handlerId].status === types_1.RequestStatus.Declined ||
                currentAccount.requests[handlerId].status === types_1.RequestStatus.Error) {
                cb(new Error('Request already declined'));
            }
            else {
                currentAccount.requests[handlerId].status = types_1.RequestStatus.Sending;
                currentAccount.requests[handlerId].notice = 'Sending';
                currentAccount.update();
                cb(null);
            }
        }
        else {
            cb(new Error('No valid request for ' + handlerId));
        }
    }
    setTxSent(handlerId, hash) {
        electron_log_1.default.info('setTxSent', handlerId, 'Hash', hash);
        const currentAccount = this.current();
        if (currentAccount && currentAccount.requests[handlerId]) {
            currentAccount.requests[handlerId].status = types_1.RequestStatus.Verifying;
            currentAccount.requests[handlerId].notice = 'Verifying';
            currentAccount.requests[handlerId].mode = types_1.RequestMode.Monitor;
            currentAccount.update();
            this.txMonitor(currentAccount, handlerId, hash);
        }
    }
    setRequestSuccess(handlerId) {
        electron_log_1.default.info('setRequestSuccess', handlerId);
        const currentAccount = this.current();
        if (currentAccount && currentAccount.requests[handlerId]) {
            currentAccount.requests[handlerId].status = types_1.RequestStatus.Success;
            currentAccount.requests[handlerId].notice = 'Successful';
            if (currentAccount.requests[handlerId].type === 'transaction') {
                currentAccount.requests[handlerId].mode = types_1.RequestMode.Monitor;
            }
            else {
                setTimeout(() => this.accounts[currentAccount.address] && this.removeRequest(currentAccount, handlerId), 3300);
            }
            currentAccount.update();
        }
    }
    clearRequestsByOrigin(address, origin) {
        if (address && origin) {
            const account = this.accounts[address];
            if (account)
                account.clearRequestsByOrigin(origin);
        }
    }
    remove(address = '') {
        address = address.toLowerCase();
        const currentAccount = this.current();
        if (currentAccount && currentAccount.address === address) {
            store_1.default.unsetAccount();
            const defaultAccount = (Object.values(this.accounts).filter((a) => a.address !== address) || [])[0];
            if (defaultAccount) {
                this._current = defaultAccount.id;
                defaultAccount.active = true;
                defaultAccount.update();
            }
        }
        if (this.accounts[address])
            this.accounts[address].close();
        store_1.default.removeAccount(address);
        delete this.accounts[address];
    }
    invalidValue(fee) {
        return !fee || isNaN(parseInt(fee, 16)) || parseInt(fee, 16) < 0;
    }
    limitedHexValue(hexValue, min, max) {
        const value = parseInt(hexValue, 16);
        if (value < min)
            return (0, util_1.intToHex)(min);
        if (value > max)
            return (0, util_1.intToHex)(max);
        return hexValue;
    }
    txFeeUpdate(inputValue, handlerId, userUpdate) {
        // Check value
        if (this.invalidValue(inputValue))
            throw new Error('txFeeUpdate, invalid input value');
        // Get current account
        const currentAccount = this.current();
        if (!currentAccount)
            throw new Error('No account selected while setting base fee');
        const request = this.getTransactionRequest(currentAccount, handlerId);
        if (!request || request.type !== 'transaction')
            throw new Error(`Could not find transaction request with handlerId ${handlerId}`);
        if (request.locked)
            throw new Error('Request has already been approved by the user');
        if (request.feesUpdatedByUser && !userUpdate)
            throw new Error('Fee has been updated by user');
        const tx = request.data;
        const gasLimit = parseInt(tx.gasLimit || '0x0', 16);
        const txType = tx.type;
        if ((0, transaction_2.usesBaseFee)(tx)) {
            const maxFeePerGas = parseInt(tx.maxFeePerGas || '0x0', 16);
            const maxPriorityFeePerGas = parseInt(tx.maxPriorityFeePerGas || '0x0', 16);
            const currentBaseFee = maxFeePerGas - maxPriorityFeePerGas;
            return {
                currentAccount,
                inputValue,
                maxFeePerGas,
                maxPriorityFeePerGas,
                gasLimit,
                currentBaseFee,
                txType,
                gasPrice: 0
            };
        }
        else {
            const gasPrice = parseInt(tx.gasPrice || '0x0', 16);
            return {
                currentAccount,
                inputValue,
                gasPrice,
                gasLimit,
                txType,
                currentBaseFee: 0,
                maxPriorityFeePerGas: 0,
                maxFeePerGas: 0
            };
        }
    }
    completeTxFeeUpdate(currentAccount, handlerId, userUpdate, previousFee) {
        const txRequest = this.getTransactionRequest(currentAccount, handlerId);
        if (userUpdate) {
            txRequest.feesUpdatedByUser = true;
            delete txRequest.automaticFeeUpdateNotice;
        }
        else {
            if (!txRequest.automaticFeeUpdateNotice && previousFee) {
                txRequest.automaticFeeUpdateNotice = { previousFee };
            }
        }
        currentAccount.update();
    }
    setBaseFee(baseFee, handlerId, userUpdate) {
        const { currentAccount, maxPriorityFeePerGas, gasLimit, currentBaseFee, txType } = this.txFeeUpdate(baseFee, handlerId, userUpdate);
        // New value
        const newBaseFee = parseInt(this.limitedHexValue(baseFee, 0, 9999 * 1e9), 16);
        // No change
        if (newBaseFee === currentBaseFee)
            return;
        const txRequest = this.getTransactionRequest(currentAccount, handlerId);
        const tx = txRequest.data;
        // New max fee per gas
        const newMaxFeePerGas = newBaseFee + maxPriorityFeePerGas;
        const maxTotalFee = (0, transaction_1.maxFee)(tx);
        // Limit max fee
        if (newMaxFeePerGas * gasLimit > maxTotalFee) {
            tx.maxFeePerGas = (0, util_1.intToHex)(Math.floor(maxTotalFee / gasLimit));
        }
        else {
            tx.maxFeePerGas = (0, util_1.intToHex)(newMaxFeePerGas);
        }
        // Complete update
        const previousFee = {
            type: txType,
            baseFee: (0, util_1.intToHex)(currentBaseFee),
            priorityFee: (0, util_1.intToHex)(maxPriorityFeePerGas)
        };
        this.completeTxFeeUpdate(currentAccount, handlerId, userUpdate, previousFee);
    }
    setPriorityFee(priorityFee, handlerId, userUpdate) {
        const { currentAccount, maxPriorityFeePerGas, gasLimit, currentBaseFee, txType } = this.txFeeUpdate(priorityFee, handlerId, userUpdate);
        // New values
        const newMaxPriorityFeePerGas = parseInt(this.limitedHexValue(priorityFee, 0, 9999 * 1e9), 16);
        // No change
        if (newMaxPriorityFeePerGas === maxPriorityFeePerGas)
            return;
        const tx = this.getTransactionRequest(currentAccount, handlerId).data;
        // New max fee per gas
        const newMaxFeePerGas = currentBaseFee + newMaxPriorityFeePerGas;
        const maxTotalFee = (0, transaction_1.maxFee)(tx);
        // Limit max fee
        if (newMaxFeePerGas * gasLimit > maxTotalFee) {
            const limitedMaxFeePerGas = Math.floor(maxTotalFee / gasLimit);
            const limitedMaxPriorityFeePerGas = limitedMaxFeePerGas - currentBaseFee;
            tx.maxPriorityFeePerGas = (0, util_1.intToHex)(limitedMaxPriorityFeePerGas);
            tx.maxFeePerGas = (0, util_1.intToHex)(limitedMaxFeePerGas);
        }
        else {
            tx.maxFeePerGas = (0, util_1.intToHex)(newMaxFeePerGas);
            tx.maxPriorityFeePerGas = (0, util_1.intToHex)(newMaxPriorityFeePerGas);
        }
        const previousFee = {
            type: txType,
            baseFee: (0, util_1.intToHex)(currentBaseFee),
            priorityFee: (0, util_1.intToHex)(maxPriorityFeePerGas)
        };
        // Complete update
        this.completeTxFeeUpdate(currentAccount, handlerId, userUpdate, previousFee);
    }
    setGasPrice(price, handlerId, userUpdate) {
        const { currentAccount, gasLimit, gasPrice, txType } = this.txFeeUpdate(price, handlerId, userUpdate);
        // New values
        const newGasPrice = parseInt(this.limitedHexValue(price, 0, 9999 * 1e9), 16);
        // No change
        if (newGasPrice === gasPrice)
            return;
        const txRequest = this.getTransactionRequest(currentAccount, handlerId);
        const tx = txRequest.data;
        const maxTotalFee = (0, transaction_1.maxFee)(tx);
        // Limit max fee
        if (newGasPrice * gasLimit > maxTotalFee) {
            tx.gasPrice = (0, util_1.intToHex)(Math.floor(maxTotalFee / gasLimit));
        }
        else {
            tx.gasPrice = (0, util_1.intToHex)(newGasPrice);
        }
        const previousFee = {
            type: txType,
            gasPrice: (0, util_1.intToHex)(gasPrice)
        };
        // Complete update
        this.completeTxFeeUpdate(currentAccount, handlerId, userUpdate, previousFee);
    }
    setGasLimit(limit, handlerId, userUpdate) {
        const { currentAccount, maxFeePerGas, gasPrice, txType } = this.txFeeUpdate(limit, handlerId, userUpdate);
        // New values
        const newGasLimit = parseInt(this.limitedHexValue(limit, 0, 12.5e6), 16);
        const txRequest = this.getTransactionRequest(currentAccount, handlerId);
        const tx = txRequest.data;
        const maxTotalFee = (0, transaction_1.maxFee)(tx);
        const fee = txType === '0x2' ? maxFeePerGas : gasPrice;
        if (newGasLimit * fee > maxTotalFee) {
            tx.gasLimit = (0, util_1.intToHex)(Math.floor(maxTotalFee / fee));
        }
        else {
            tx.gasLimit = (0, util_1.intToHex)(newGasLimit);
        }
        // Complete update
        this.completeTxFeeUpdate(currentAccount, handlerId, userUpdate, false);
    }
    removeFeeUpdateNotice(handlerId, cb) {
        const currentAccount = this.current();
        if (!currentAccount)
            return cb(new Error('No account selected while removing fee notice'));
        const txRequest = this.getTransactionRequest(currentAccount, handlerId);
        if (!txRequest)
            return cb(new Error(`Could not find request ${handlerId}`));
        delete txRequest.automaticFeeUpdateNotice;
        currentAccount.update();
        cb(null);
    }
    adjustNonce(handlerId, nonceAdjust) {
        const currentAccount = this.current();
        if (nonceAdjust !== 1 && nonceAdjust !== -1)
            return electron_log_1.default.error('Invalid nonce adjustment', nonceAdjust);
        if (!currentAccount)
            return electron_log_1.default.error('No account selected during nonce adjustement', nonceAdjust);
        const txRequest = this.getTransactionRequest(currentAccount, handlerId);
        txRequest.data = Object.assign({}, txRequest.data);
        if (txRequest && txRequest.type === 'transaction') {
            const nonce = txRequest.data && txRequest.data.nonce;
            if (nonce) {
                let updatedNonce = parseInt(nonce, 16) + nonceAdjust;
                if (updatedNonce < 0)
                    updatedNonce = 0;
                const adjustedNonce = (0, util_1.intToHex)(updatedNonce);
                txRequest.data.nonce = adjustedNonce;
                currentAccount.update();
            }
            else {
                const { from, chainId } = txRequest.data;
                this.sendRequest({ method: 'eth_getTransactionCount', chainId, params: [from, 'pending'] }, (res) => {
                    if (res.result) {
                        const newNonce = parseInt(res.result, 16);
                        let updatedNonce = nonceAdjust === 1 ? newNonce : newNonce + nonceAdjust;
                        if (updatedNonce < 0)
                            updatedNonce = 0;
                        const adjustedNonce = (0, util_1.intToHex)(updatedNonce);
                        txRequest.data.nonce = adjustedNonce;
                        currentAccount.update();
                    }
                });
            }
        }
    }
    resetNonce(handlerId) {
        const currentAccount = this.current();
        if (!currentAccount)
            return electron_log_1.default.error('No account selected during nonce reset');
        const txRequest = this.getTransactionRequest(currentAccount, handlerId);
        const initialNonce = txRequest.payload.params[0].nonce;
        if (initialNonce) {
            txRequest.data.nonce = initialNonce;
        }
        else {
            delete txRequest.data.nonce;
        }
        currentAccount.update();
    }
    lockRequest(handlerId) {
        // When a request is approved, lock it so that no automatic updates such as fee changes can happen
        const currentAccount = this.current();
        if (currentAccount && currentAccount.requests[handlerId]) {
            ;
            currentAccount.requests[handlerId].locked = true;
        }
        else {
            electron_log_1.default.error('Trying to lock request ' + handlerId + ' but there is no current account');
        }
    }
}
exports.Accounts = Accounts;
exports.default = new Accounts();
