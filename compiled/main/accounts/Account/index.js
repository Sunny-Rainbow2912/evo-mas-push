"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_log_1 = __importDefault(require("electron-log"));
const util_1 = require("@ethereumjs/util");
const __1 = require("..");
const nebula_1 = __importDefault(require("../../nebula"));
const signers_1 = __importDefault(require("../../signers"));
const windows_1 = __importDefault(require("../../windows"));
const nav_1 = __importDefault(require("../../windows/nav"));
const store_1 = __importDefault(require("../../store"));
const signer_1 = require("../../../resources/domain/signer");
const provider_1 = __importDefault(require("../../provider"));
const reveal_1 = __importDefault(require("../../reveal"));
const request_1 = require("../../../resources/domain/request");
const erc20_1 = __importDefault(require("../../contracts/erc20"));
const nebula = (0, nebula_1.default)();
const storeApi = {
    getPermissions: function (address) {
        return ((0, store_1.default)('main.permissions', address) || {});
    }
};
class FrameAccount {
    constructor(params, accounts) {
        this.requests = {};
        this.status = 'ok';
        this.active = false;
        const { lastSignerType, name, ensName, created, address, active, options = {} } = params;
        this.accounts = accounts; // Parent Accounts Module
        const formattedAddress = (address && address.toLowerCase()) || '0x';
        this.id = formattedAddress; // Account ID
        this.address = formattedAddress;
        this.lastSignerType = lastSignerType || options.type;
        this.active = active;
        this.name = name;
        this.ensName = ensName;
        this.created = created || `new:${Date.now()}`;
        this.signer = ''; // Matched Signer ID
        this.signerStatus = '';
        const existingPermissions = storeApi.getPermissions(this.address);
        const currentSendDappPermission = Object.values(existingPermissions).find((p) => (p.origin || '').toLowerCase().includes('send.frame.eth'));
        if (!currentSendDappPermission) {
            store_1.default.setPermission(this.address, {
                handlerId: 'send-dapp-native',
                origin: 'send.frame.eth',
                provider: true
            });
        }
        this.update();
        this.accountObserver = store_1.default.observer(() => {
            // When signer data changes in any way this will rerun to make sure we're matched correctly
            const updatedSigner = this.findSigner(this.address);
            if (updatedSigner) {
                if (this.signer !== updatedSigner.id || this.signerStatus !== updatedSigner.status) {
                    this.signer = updatedSigner.id;
                    const signerType = (0, signer_1.getSignerType)(updatedSigner.type);
                    this.lastSignerType = signerType || this.lastSignerType;
                    this.signerStatus = updatedSigner.status;
                    if (updatedSigner.status === 'ok' && this.id === this.accounts._current) {
                        this.verifyAddress(false, (err, verified) => {
                            if (!err && !verified)
                                this.signer = '';
                        });
                    }
                }
            }
            else {
                this.signer = '';
            }
            this.update();
        }, `account:${this.address}`);
        if (this.created.split(':')[0] === 'new') {
            provider_1.default.on('connect', () => {
                provider_1.default.send({
                    jsonrpc: '2.0',
                    id: 1,
                    chainId: '0x1',
                    method: 'eth_blockNumber',
                    _origin: 'frame-internal',
                    params: []
                }, (response) => {
                    if (response.result)
                        this.created = parseInt(response.result, 16) + ':' + this.created.split(':')[1];
                    this.update();
                });
            });
        }
        if (nebula.ready()) {
            this.lookupAddress(); // We need to recheck this on every network change...
        }
        else {
            nebula.once('ready', this.lookupAddress.bind(this));
        }
        this.update();
    }
    async lookupAddress() {
        try {
            this.ensName = (await nebula.ens.reverseLookup(this.address))[0];
            this.update();
        }
        catch (e) {
            electron_log_1.default.error('lookupAddress Error:', e);
            this.ensName = '';
            this.update();
        }
    }
    findSigner(address) {
        const signers = (0, store_1.default)('main.signers');
        const signerOrdinal = (signer) => {
            const isOk = signer.status === 'ok' ? 2 : 1;
            const signerIndex = Object.values(signer_1.Type).findIndex((type) => type === signer.type);
            const typeIndex = Math.max(signerIndex, 0);
            return isOk * typeIndex;
        };
        const availableSigners = Object.values(signers)
            .filter((signer) => signer.addresses.some((addr) => addr.toLowerCase() === address))
            .sort((a, b) => signerOrdinal(b) - signerOrdinal(a));
        return availableSigners[0];
    }
    setAccess(req, access) {
        const { handlerId, origin, account } = req;
        if (account.toLowerCase() === this.address) {
            // Permissions do no live inside the account summary
            const { name } = (0, store_1.default)('main.origins', origin);
            store_1.default.setPermission(this.address, { handlerId, origin: name, provider: access });
        }
        this.resolveRequest(req);
    }
    getRequest(id) {
        return this.requests[id];
    }
    resolveRequest({ handlerId, payload }, result) {
        const knownRequest = this.requests[handlerId];
        if (knownRequest) {
            if (knownRequest.res && payload) {
                const { id, jsonrpc } = payload;
                knownRequest.res({ id, jsonrpc, result });
            }
            this.clearRequest(knownRequest.handlerId);
        }
    }
    rejectRequest({ handlerId, payload }, error) {
        const knownRequest = this.requests[handlerId];
        if (knownRequest) {
            if (knownRequest.res && payload) {
                const { id, jsonrpc } = payload;
                knownRequest.res({ id, jsonrpc, error });
            }
            this.clearRequest(knownRequest.handlerId);
        }
    }
    clearRequest(handlerId) {
        electron_log_1.default.info(`clearRequest(${handlerId}) for account ${this.id}`);
        delete this.requests[handlerId];
        store_1.default.navClearReq(handlerId, Object.keys(this.requests).length > 0);
        this.update();
    }
    clearRequestsByOrigin(origin) {
        Object.entries(this.requests).forEach(([_handlerId, req]) => {
            if (req.origin === origin) {
                const err = { code: 4001, message: 'User rejected the request' };
                this.rejectRequest(req, err);
            }
        });
    }
    addRequiredApproval(req, type, data = {}, onApprove = () => { }) {
        // TODO: turn TransactionRequest into its own class
        const approve = (data) => {
            const confirmedApproval = req.approvals.find((a) => a.type === type);
            if (confirmedApproval) {
                onApprove(data);
                confirmedApproval.approved = true;
                this.update();
            }
        };
        req.approvals = [
            ...(req.approvals || []),
            {
                type,
                data,
                approved: false,
                approve
            }
        ];
    }
    resError(err, payload, res) {
        const error = typeof err === 'string' ? { message: err, code: -1 } : err;
        electron_log_1.default.error(error);
        res({ id: payload.id, jsonrpc: payload.jsonrpc, error });
    }
    async recipientIdentity(req) {
        const { to } = req.data;
        if (to) {
            // Get recipient identity
            try {
                const recipient = await reveal_1.default.identity(to);
                const knownTxRequest = this.requests[req.handlerId];
                if (recipient && knownTxRequest) {
                    knownTxRequest.recipient = recipient.ens;
                    this.update();
                }
            }
            catch (e) {
                electron_log_1.default.warn(e);
            }
        }
    }
    async decodeCalldata(req) {
        const { to, chainId, data: calldata } = req.data;
        if (to && calldata && calldata !== '0x' && parseInt(calldata, 16) !== 0) {
            try {
                // Decode calldata
                const decodedData = await reveal_1.default.decode(to, parseInt(chainId, 16), calldata);
                const knownTxRequest = this.requests[req.handlerId];
                if (knownTxRequest && decodedData) {
                    knownTxRequest.decodedData = decodedData;
                    this.update();
                }
            }
            catch (e) {
                electron_log_1.default.warn(e);
            }
        }
    }
    async recognizeActions(req) {
        const { to, chainId, data: calldata } = req.data;
        if (to && calldata && calldata !== '0x' && parseInt(calldata, 16) !== 0) {
            try {
                // Recognize actions
                const actions = await reveal_1.default.recog(calldata, {
                    contractAddress: to,
                    chainId: parseInt(chainId, 16),
                    account: this.address
                });
                const knownTxRequest = this.requests[req.handlerId];
                if (knownTxRequest && actions) {
                    knownTxRequest.recognizedActions = actions;
                    this.update();
                }
            }
            catch (e) {
                electron_log_1.default.warn(e);
            }
        }
    }
    async decodeTypedMessage(req) {
        if (req.type === 'signTypedData')
            return;
        const knownRequest = this.requests[req.handlerId];
        if (!knownRequest)
            return;
        try {
            const permitRequest = knownRequest;
            const { permit } = permitRequest;
            const contract = new erc20_1.default(permit.verifyingContract.address, Number(permit.chainId));
            const [tokenData, contractIdentity, spenderIdentity] = await Promise.all([
                contract.getTokenData(),
                reveal_1.default.identity(permit.verifyingContract.address),
                reveal_1.default.identity(permit.spender.address)
            ]);
            Object.assign(permitRequest, {
                tokenData,
                permit: {
                    ...permit,
                    verifyingContract: { ...permit.verifyingContract, ...contractIdentity },
                    spender: { ...permit.spender, ...spenderIdentity }
                }
            });
            this.update();
        }
        catch (error) {
            electron_log_1.default.warn('unable to decode typed message', { error, handlerId: req.handlerId });
        }
    }
    async revealDetails(req) {
        if (!req)
            return;
        if ((0, request_1.isTransactionRequest)(req)) {
            this.recipientIdentity(req);
            this.decodeCalldata(req);
            this.recognizeActions(req);
            return;
        }
        if ((0, request_1.isTypedMessageSignatureRequest)(req)) {
            this.decodeTypedMessage(req);
        }
    }
    addRequest(req, res = () => { }) {
        const add = async (r) => {
            this.requests[r.handlerId] = req;
            this.requests[r.handlerId].mode = __1.RequestMode.Normal;
            this.requests[r.handlerId].created = Date.now();
            this.requests[r.handlerId].res = res;
            this.revealDetails(req);
            this.update();
            store_1.default.setSignerView('default');
            store_1.default.setPanelView('default');
            // Display request
            const { account } = req;
            // Check if this account is open
            const accountOpen = (0, store_1.default)('selected.current') === account;
            // Does the current panel nav include a 'requestView'
            const panelNav = (0, store_1.default)('windows.panel.nav') || [];
            const inExpandedRequestsView = panelNav[0]?.view === 'expandedModule' && panelNav[0]?.data?.id === 'requests';
            const inRequestView = panelNav.map((crumb) => crumb.view).includes('requestView');
            if (accountOpen) {
                if (inRequestView) {
                    nav_1.default.back('panel');
                    nav_1.default.back('panel');
                }
                else if (inExpandedRequestsView) {
                    nav_1.default.back('panel');
                }
                nav_1.default.forward('panel', {
                    view: 'expandedModule',
                    data: {
                        id: 'requests',
                        account: account
                    }
                });
                if (!(0, store_1.default)('tray.open') || !inRequestView) {
                    const crumb = {
                        view: 'requestView',
                        data: {
                            step: 'confirm',
                            accountId: account,
                            requestId: req.handlerId
                        }
                    };
                    nav_1.default.forward('panel', crumb);
                }
            }
            setTimeout(() => {
                windows_1.default.showTray();
            }, 100);
        };
        add(req);
    }
    getSigner() {
        return this.signer ? signers_1.default.get(this.signer) : undefined;
    }
    verifyAddress(display, cb) {
        const signer = signers_1.default.get(this.signer) || {};
        if (signer.verifyAddress && signer.status === 'ok') {
            const index = signer.addresses.map((a) => a.toLowerCase()).indexOf(this.address);
            if (index > -1) {
                signer.verifyAddress(index, this.address, display, cb);
            }
            else {
                electron_log_1.default.info('Could not find address in signer');
                cb(new Error('Could not find address in signer'));
            }
        }
        else {
            electron_log_1.default.info('Signer not accessible to verify address');
            cb(new Error('Signer not accessible to verify address'));
        }
    }
    getSelectedAddresses() {
        return [this.address];
    }
    getSelectedAddress() {
        return this.address;
    }
    summary() {
        const update = JSON.parse(JSON.stringify({
            id: this.id,
            name: this.name,
            lastSignerType: this.lastSignerType,
            address: this.address,
            status: this.status,
            active: this.active,
            signer: this.signer,
            requests: this.requests,
            ensName: this.ensName,
            created: this.created
        }));
        return update;
    }
    update() {
        this.accounts.update(this.summary());
    }
    rename(name) {
        this.name = name;
        this.update();
    }
    getCoinbase(cb) {
        cb(null, [this.address]);
    }
    getAccounts(cb) {
        const account = this.address;
        if (cb)
            cb(null, account ? [account] : []);
        return account ? [account] : [];
    }
    close() {
        this.accountObserver.remove();
    }
    signMessage(message, cb) {
        if (!message)
            return cb(new Error('No message to sign'));
        if (this.signer) {
            const s = signers_1.default.get(this.signer);
            if (!s)
                return cb(new Error(`Cannot find signer for this account`));
            const index = s.addresses.map((a) => a.toLowerCase()).indexOf(this.address);
            if (index === -1)
                cb(new Error(`Signer cannot sign for this address`));
            s.signMessage(index, message, cb);
        }
        else {
            cb(new Error('No signer found for this account'));
        }
    }
    signTypedData(typedMessage, cb) {
        if (!typedMessage.data)
            return cb(new Error('No data to sign'));
        if (typeof typedMessage.data !== 'object')
            return cb(new Error('Data to sign has the wrong format'));
        if (this.signer) {
            const s = signers_1.default.get(this.signer);
            if (!s)
                return cb(new Error(`Cannot find signer for this account`));
            const index = s.addresses.map((a) => a.toLowerCase()).indexOf(this.address);
            if (index === -1)
                cb(new Error(`Signer cannot sign for this address`));
            s.signTypedData(index, typedMessage, cb);
        }
        else {
            cb(new Error('No signer found for this account'));
        }
    }
    signTransaction(rawTx, cb) {
        // if(index === typeof 'object' && cb === typeof 'undefined' && typeof rawTx === 'function') cb = rawTx; rawTx = index; index = 0;
        this.validateTransaction(rawTx, (err) => {
            if (err)
                return cb(err);
            if (this.signer) {
                const s = signers_1.default.get(this.signer);
                if (!s)
                    return cb(new Error(`Cannot find signer for this account`));
                const index = s.addresses.map((a) => a.toLowerCase()).indexOf(this.address);
                if (index === -1)
                    cb(new Error(`Signer cannot sign for this address`));
                s.signTransaction(index, rawTx, cb);
            }
            else {
                cb(new Error('No signer found for this account'));
            }
        });
    }
    validateTransaction(rawTx, cb) {
        // Validate 'from' address
        if (!rawTx.from)
            return new Error("Missing 'from' address");
        if (!(0, util_1.isValidAddress)(rawTx.from))
            return cb(new Error("Invalid 'from' address"));
        // Ensure that transaction params are valid hex strings
        const enforcedKeys = [
            'value',
            'data',
            'to',
            'from',
            'gas',
            'gasPrice',
            'gasLimit',
            'nonce'
        ];
        const keys = Object.keys(rawTx);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (enforcedKeys.indexOf(key) > -1 && !this.isValidHexString(rawTx[key])) {
                // Break on first error
                cb(new Error(`Transaction parameter '${key}' is not a valid hex string`));
                break;
            }
        }
        return cb(null);
    }
    isValidHexString(str) {
        const pattern = /^0x[0-9a-fA-F]*$/;
        return pattern.test(str);
    }
}
exports.default = FrameAccount;
