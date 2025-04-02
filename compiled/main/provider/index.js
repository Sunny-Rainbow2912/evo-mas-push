"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Provider = void 0;
const events_1 = __importDefault(require("events"));
const crypto_1 = __importDefault(require("crypto"));
const electron_log_1 = __importDefault(require("electron-log"));
const uuid_1 = require("uuid");
const providers_1 = require("@ethersproject/providers");
const ethers_1 = require("ethers");
const sdk_1 = require("@eth-optimism/sdk");
const eth_sig_util_1 = require("@metamask/eth-sig-util");
const address_1 = require("@ethersproject/address");
const util_1 = require("@ethereumjs/util");
const store_1 = __importDefault(require("../store"));
const package_json_1 = __importDefault(require("../../package.json"));
const proxy_1 = __importDefault(require("./proxy"));
const accounts_1 = __importDefault(require("../accounts"));
const chains_1 = __importDefault(require("../chains"));
const reveal_1 = __importDefault(require("../reveal"));
const signer_1 = require("../../resources/domain/signer");
const transaction_1 = require("../../resources/domain/transaction");
const transaction_2 = require("../transaction");
const utils_1 = require("../../resources/utils");
const constants_1 = require("../../resources/constants");
const assets_1 = require("./assets");
const typedData_1 = require("./typedData");
const subscriptions_1 = require("./subscriptions");
const helpers_1 = require("./helpers");
const chains_2 = require("./chains");
const sigParser = __importStar(require("../signatures"));
const account_1 = require("../../resources/domain/account");
const requests_1 = require("../requests");
const storeApi = {
    getOrigin: (id) => (0, store_1.default)('main.origins', id)
};
const getPayloadOrigin = ({ _origin }) => storeApi.getOrigin(_origin);
class Provider extends events_1.default {
    constructor() {
        super();
        this.connected = false;
        this.connection = chains_1.default;
        this.handlers = {};
        this.subscriptions = {
            accountsChanged: [],
            assetsChanged: [],
            chainChanged: [],
            chainsChanged: [],
            networkChanged: []
        };
        this.connection.on('connect', (...args) => {
            this.connected = true;
            this.emit('connect', ...args);
        });
        this.connection.on('close', () => {
            this.connected = false;
        });
        this.connection.on('data', (chain, ...args) => {
            if ((args[0] || {}).method === 'eth_subscription') {
                this.emit('data:subscription', ...args);
            }
            this.emit(`data:${chain.type}:${chain.id}`, ...args);
        });
        this.connection.on('error', (chain, err) => {
            electron_log_1.default.error(err);
        });
        this.connection.on('update', (chain, event) => {
            if (event.type === 'fees') {
                return accounts_1.default.updatePendingFees(chain.id);
            }
            if (event.type === 'status') {
                this.emit(`status:${chain.type}:${chain.id}`, event.status);
            }
        });
        proxy_1.default.on('provider:send', (payload) => {
            const { id, method } = payload;
            this.send(payload, ({ error, result }) => {
                proxy_1.default.emit('payload', { id, method, error, result });
            });
        });
        proxy_1.default.on('provider:subscribe', (payload) => {
            const subId = this.createSubscription(payload);
            const { id, jsonrpc } = payload;
            proxy_1.default.emit('payload', { id, jsonrpc, result: subId });
        });
        this.getNonce = this.getNonce.bind(this);
    }
    accountsChanged(accounts) {
        const address = accounts[0];
        this.subscriptions.accountsChanged
            .filter((subscription) => (0, subscriptions_1.hasSubscriptionPermission)("accountsChanged" /* SubscriptionType.ACCOUNTS */, address, subscription.originId))
            .forEach((subscription) => this.sendSubscriptionData(subscription.id, accounts));
    }
    assetsChanged(address, assets) {
        this.subscriptions.assetsChanged
            .filter((subscription) => (0, subscriptions_1.hasSubscriptionPermission)("assetsChanged" /* SubscriptionType.ASSETS */, address, subscription.originId))
            .forEach((subscription) => this.sendSubscriptionData(subscription.id, { ...assets, account: address }));
    }
    chainChanged(chainId, originId) {
        const chain = (0, util_1.intToHex)(chainId);
        this.subscriptions.chainChanged
            .filter((subscription) => subscription.originId === originId)
            .forEach((subscription) => this.sendSubscriptionData(subscription.id, chain));
    }
    // fires when the list of available chains changes
    chainsChanged(address, chains) {
        this.subscriptions.chainsChanged
            .filter((subscription) => (0, subscriptions_1.hasSubscriptionPermission)('chainsChanged', address, subscription.originId))
            .forEach((subscription) => this.sendSubscriptionData(subscription.id, chains));
    }
    networkChanged(netId, originId) {
        this.subscriptions.networkChanged
            .filter((subscription) => subscription.originId === originId)
            .forEach((subscription) => this.sendSubscriptionData(subscription.id, netId));
    }
    sendSubscriptionData(subscription, result) {
        const payload = {
            jsonrpc: '2.0',
            method: 'eth_subscription',
            params: { subscription, result }
        };
        proxy_1.default.emit('payload', payload);
        this.emit('data:subscription', payload);
    }
    getNetVersion(payload, res, targetChain) {
        const chain = (0, store_1.default)('main.networks.ethereum', targetChain.id);
        const response = chain?.on
            ? { result: targetChain.id }
            : { error: { message: 'not connected', code: -1 } };
        res({ id: payload.id, jsonrpc: payload.jsonrpc, ...response });
    }
    getChainId(payload, res, targetChain) {
        const chain = (0, store_1.default)('main.networks.ethereum', targetChain.id);
        const response = chain?.on
            ? { result: (0, util_1.intToHex)(targetChain.id) }
            : { error: { message: 'not connected', code: -1 } };
        res({ id: payload.id, jsonrpc: payload.jsonrpc, ...response });
    }
    declineRequest(req) {
        const res = (data) => {
            if (this.handlers[req.handlerId])
                this.handlers[req.handlerId](data);
            delete this.handlers[req.handlerId];
        };
        const payload = req.payload;
        (0, helpers_1.resError)({ message: 'User declined transaction', code: 4001 }, payload, res);
    }
    verifySignature(signed, message, address, cb) {
        (0, helpers_1.getSignedAddress)(signed, message, (err, verifiedAddress) => {
            if (err)
                return cb(err);
            if ((verifiedAddress || '').toLowerCase() !== address.toLowerCase())
                return cb(new Error('EvoTradeWallet verifySignature: Failed ecRecover check'));
            cb(null, true);
        });
    }
    approveSign(req, cb) {
        const res = (data) => {
            if (this.handlers[req.handlerId])
                this.handlers[req.handlerId](data);
            delete this.handlers[req.handlerId];
        };
        const payload = req.payload;
        let [address, rawMessage] = payload.params;
        let message = rawMessage;
        if ((0, util_1.isHexString)(rawMessage)) {
            if (!(0, util_1.isHexPrefixed)(rawMessage)) {
                message = (0, util_1.addHexPrefix)(rawMessage);
            }
        }
        else {
            message = (0, util_1.fromUtf8)(rawMessage);
        }
        accounts_1.default.signMessage(address, message, (err, signed) => {
            if (err) {
                (0, helpers_1.resError)(err.message, payload, res);
                cb(err, undefined);
            }
            else {
                const signature = signed || '';
                this.verifySignature(signature, message, address, (err) => {
                    if (err) {
                        (0, helpers_1.resError)(err.message, payload, res);
                        cb(err);
                    }
                    else {
                        res({ id: payload.id, jsonrpc: payload.jsonrpc, result: signature });
                        cb(null, signature);
                    }
                });
            }
        });
    }
    approveSignTypedData(req, cb) {
        const res = (data) => {
            if (this.handlers[req.handlerId])
                this.handlers[req.handlerId](data);
            delete this.handlers[req.handlerId];
        };
        const { payload, typedMessage } = req;
        const [address] = payload.params;
        accounts_1.default.signTypedData(address, typedMessage, (err, signature = '') => {
            if (err) {
                (0, helpers_1.resError)(err.message, payload, res);
                cb(err);
            }
            else {
                try {
                    const recoveredAddress = (0, eth_sig_util_1.recoverTypedSignature)({ ...typedMessage, signature });
                    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
                        throw new Error('TypedData signature verification failed');
                    }
                    res({ id: payload.id, jsonrpc: payload.jsonrpc, result: signature });
                    cb(null, signature);
                }
                catch (e) {
                    const err = e;
                    (0, helpers_1.resError)(err.message, payload, res);
                    cb(err);
                }
            }
        });
    }
    async getL1GasCost(txData) {
        const { chainId, type, ...tx } = txData;
        const txRequest = {
            ...tx,
            type: parseInt(type, 16),
            chainId: parseInt(chainId, 16)
        };
        const connection = this.connection.connections['ethereum'][txRequest.chainId];
        const connectedProvider = connection?.primary?.connected
            ? connection.primary?.provider
            : connection.secondary?.provider;
        if (!connectedProvider) {
            return ethers_1.BigNumber.from(0);
        }
        return (0, sdk_1.estimateL1GasCost)(new providers_1.Web3Provider(connectedProvider), txRequest);
    }
    signAndSend(req, cb) {
        const rawTx = req.data;
        const res = (data) => {
            if (this.handlers[req.handlerId])
                this.handlers[req.handlerId](data);
            delete this.handlers[req.handlerId];
        };
        const payload = req.payload;
        const maxTotalFee = (0, transaction_2.maxFee)(rawTx);
        if ((0, helpers_1.feeTotalOverMax)(rawTx, maxTotalFee)) {
            const chainId = parseInt(rawTx.chainId);
            const symbol = (0, store_1.default)(`main.networks.ethereum.${chainId}.symbol`);
            const displayAmount = symbol ? ` (${Math.floor(maxTotalFee / 1e18)} ${symbol})` : '';
            const err = `Max fee is over hard limit${displayAmount}`;
            (0, helpers_1.resError)(err, payload, res);
            cb(new Error(err));
        }
        else {
            accounts_1.default.signTransaction(rawTx, (err, signedTx) => {
                // Sign Transaction
                if (err) {
                    (0, helpers_1.resError)(err, payload, res);
                    cb(err);
                }
                else {
                    accounts_1.default.setTxSigned(req.handlerId, (err) => {
                        if (err)
                            return cb(err);
                        let done = false;
                        const cast = () => {
                            this.connection.send({
                                id: req.payload.id,
                                jsonrpc: req.payload.jsonrpc,
                                method: 'eth_sendRawTransaction',
                                params: [signedTx]
                            }, (response) => {
                                clearInterval(broadcastTimer);
                                if (done)
                                    return;
                                done = true;
                                if (response.error) {
                                    (0, helpers_1.resError)(response.error, payload, res);
                                    cb(new Error(response.error.message));
                                }
                                else {
                                    res(response);
                                    cb(null, response.result);
                                }
                            }, {
                                type: 'ethereum',
                                id: parseInt(req.data.chainId, 16)
                            });
                        };
                        const broadcastTimer = setInterval(() => cast(), 1000);
                        cast();
                    });
                }
            });
        }
    }
    approveTransactionRequest(req, cb) {
        const signAndSend = (requestToSign) => {
            // remove callback from logging
            const { res, ...txToLog } = requestToSign;
            electron_log_1.default.info('approveRequest', txToLog);
            this.signAndSend(requestToSign, cb);
        };
        accounts_1.default.lockRequest(req.handlerId);
        if (req.data.nonce)
            return signAndSend(req);
        this.getNonce(req.data, (response) => {
            if (response.error) {
                if (this.handlers[req.handlerId]) {
                    this.handlers[req.handlerId](response);
                    delete this.handlers[req.handlerId];
                }
                return cb(new Error(response.error.message));
            }
            const updatedReq = accounts_1.default.updateNonce(req.handlerId, response.result);
            if (updatedReq) {
                signAndSend(updatedReq);
            }
            else {
                electron_log_1.default.error(`could not find request with handlerId="${req.handlerId}"`);
                cb(new Error('could not find request'));
            }
        });
    }
    addRequestHandler(res) {
        const handlerId = (0, uuid_1.v4)();
        this.handlers[handlerId] = res;
        return handlerId;
    }
    async getGasEstimate(rawTx) {
        const { from, to, value, data, nonce } = rawTx;
        const txParams = { from, to, value, data, nonce };
        const payload = {
            method: 'eth_estimateGas',
            params: [txParams],
            jsonrpc: '2.0',
            id: 1
        };
        const targetChain = {
            type: 'ethereum',
            id: parseInt(rawTx.chainId, 16)
        };
        return new Promise((resolve, reject) => {
            this.connection.send(payload, (response) => {
                if (response.error) {
                    electron_log_1.default.warn(`error estimating gas for tx to ${txParams.to}: ${response.error}`);
                    return reject(response.error);
                }
                const estimatedLimit = parseInt(response.result, 16);
                const paddedLimit = Math.ceil(estimatedLimit * 1.5);
                electron_log_1.default.verbose(`gas estimate for tx to ${txParams.to}: ${estimatedLimit}, using ${paddedLimit} as gas limit`);
                return resolve((0, util_1.addHexPrefix)(paddedLimit.toString(16)));
            }, targetChain);
        });
    }
    getNonce(rawTx, res) {
        const targetChain = {
            type: 'ethereum',
            id: parseInt(rawTx.chainId, 16)
        };
        this.connection.send({ id: 1, jsonrpc: '2.0', method: 'eth_getTransactionCount', params: [rawTx.from, 'pending'] }, res, targetChain);
    }
    async fillTransaction(newTx, cb) {
        if (!newTx) {
            return cb(new Error('No transaction data'));
        }
        const connection = this.connection.connections['ethereum'][parseInt(newTx.chainId, 16)];
        const chainConnected = connection && (connection.primary?.connected || connection.secondary?.connected);
        if (!chainConnected) {
            return cb(new Error(`Chain ${newTx.chainId} not connected`));
        }
        try {
            const approvals = [];
            const rawTx = (0, helpers_1.getRawTx)(newTx);
            const gas = (0, helpers_1.gasFees)(rawTx);
            const { chainConfig } = connection;
            const estimateGasLimit = async () => {
                try {
                    return await this.getGasEstimate(rawTx);
                }
                catch (error) {
                    approvals.push({
                        type: constants_1.ApprovalType.GasLimitApproval,
                        data: {
                            message: error.message,
                            gasLimit: '0x00'
                        }
                    });
                    return '0x00';
                }
            };
            const [gasLimit, recipientType] = await Promise.all([
                rawTx.gasLimit ?? estimateGasLimit(),
                rawTx.to ? reveal_1.default.resolveEntityType(rawTx.to, parseInt(rawTx.chainId, 16)) : ''
            ]);
            const tx = { ...rawTx, gasLimit, recipientType };
            try {
                const populatedTransaction = (0, transaction_2.populate)(tx, chainConfig, gas);
                const checkedTransaction = (0, helpers_1.checkExistingNonceGas)(populatedTransaction);
                electron_log_1.default.verbose('Successfully populated transaction', checkedTransaction);
                cb(null, { tx: checkedTransaction, approvals });
            }
            catch (error) {
                return cb(error);
            }
        }
        catch (e) {
            electron_log_1.default.error('error creating transaction', e);
            cb(e);
        }
    }
    sendTransaction(payload, res, targetChain) {
        try {
            const txParams = payload.params[0];
            const payloadChain = payload.chainId;
            const normalizedTx = (0, transaction_1.normalizeChainId)(txParams, payloadChain ? parseInt(payloadChain, 16) : undefined);
            const tx = {
                ...normalizedTx,
                chainId: normalizedTx.chainId || payloadChain || (0, util_1.addHexPrefix)(targetChain.id.toString(16))
            };
            const currentAccount = accounts_1.default.current();
            electron_log_1.default.verbose(`sendTransaction(${JSON.stringify(tx)}`);
            const from = tx.from || (currentAccount && currentAccount.id);
            if (!currentAccount || !from || !(0, account_1.hasAddress)(currentAccount, from)) {
                return (0, helpers_1.resError)('Transaction is not from currently selected account', payload, res);
            }
            this.fillTransaction({ ...tx, from }, (err, transactionMetadata) => {
                if (err) {
                    (0, helpers_1.resError)(err, payload, res);
                }
                else {
                    const handlerId = this.addRequestHandler(res);
                    const txMetadata = transactionMetadata;
                    const { feesUpdated, recipientType, ...data } = txMetadata.tx;
                    const unclassifiedReq = {
                        handlerId,
                        type: 'transaction',
                        data,
                        payload,
                        account: currentAccount.id,
                        origin: payload._origin,
                        approvals: [],
                        feesUpdatedByUser: false,
                        recipientType,
                        recognizedActions: []
                    };
                    const classification = (0, transaction_2.classifyTransaction)(unclassifiedReq);
                    const req = {
                        ...unclassifiedReq,
                        classification
                    };
                    accounts_1.default.addRequest(req, res);
                    txMetadata.approvals.forEach((approval) => {
                        currentAccount?.addRequiredApproval(req, approval.type, approval.data);
                    });
                }
            });
        }
        catch (e) {
            (0, helpers_1.resError)(e.message, payload, res);
        }
    }
    getTransactionByHash(payload, cb, targetChain) {
        const res = (response) => {
            if (response.result && !response.result.gasPrice && response.result.maxFeePerGas) {
                return cb({ ...response, result: { ...response.result, gasPrice: response.result.maxFeePerGas } });
            }
            cb(response);
        };
        this.connection.send(payload, res, targetChain);
    }
    _personalSign(payload, res) {
        const params = payload.params || [];
        if ((0, address_1.isAddress)(params[0]) && !(0, address_1.isAddress)(params[1])) {
            // personal_sign requests expect the first parameter to be the message and the second
            // parameter to be an address. however some clients send these in the opposite order
            // so try to detect that
            return this.sign(payload, res);
        }
        // switch the order of params to be consistent with eth_sign
        return this.sign({ ...payload, params: [params[1], params[0], ...params.slice(2)] }, res);
    }
    sign(payload, res) {
        const [from, message] = payload.params || [];
        const currentAccount = accounts_1.default.current();
        if (!message) {
            return (0, helpers_1.resError)('Sign request requires a message param', payload, res);
        }
        if (!currentAccount || !(0, account_1.hasAddress)(currentAccount, from)) {
            return (0, helpers_1.resError)('Sign request is not from currently selected account', payload, res);
        }
        const handlerId = this.addRequestHandler(res);
        const req = {
            handlerId,
            type: 'sign',
            payload,
            account: currentAccount.getAccounts()[0],
            origin: payload._origin,
            data: {
                decodedMessage: (0, helpers_1.decodeMessage)(message)
            }
        };
        const _res = (data) => {
            if (this.handlers[req.handlerId])
                this.handlers[req.handlerId](data);
            delete this.handlers[req.handlerId];
        };
        accounts_1.default.addRequest(req, _res);
    }
    signTypedData(rawPayload, version, res) {
        // ensure param order is [address, data, ...] regardless of version
        const orderedParams = (0, address_1.isAddress)(rawPayload.params[1]) && !(0, address_1.isAddress)(rawPayload.params[0])
            ? [rawPayload.params[1], rawPayload.params[0], ...rawPayload.params.slice(2)]
            : [...rawPayload.params];
        const payload = {
            ...rawPayload,
            params: orderedParams
        };
        let [from = '', typedData, ...additionalParams] = payload.params;
        if (!typedData) {
            return (0, helpers_1.resError)(`Missing typed data`, payload, res);
        }
        // HACK: Standards clearly say, that second param is an object but it seems like in the wild it can be a JSON-string.
        if (typeof typedData === 'string') {
            try {
                typedData = JSON.parse(typedData);
                payload.params = [from, typedData, ...additionalParams];
            }
            catch (e) {
                return (0, helpers_1.resError)('Malformed typed data', payload, res);
            }
        }
        if (!Array.isArray(typedData) && !typedData.message) {
            return (0, helpers_1.resError)('Typed data missing message', payload, res);
        }
        // no explicit version called so we choose one which best fits the data
        if (!version) {
            version = (0, typedData_1.getVersionFromTypedData)(typedData);
        }
        const targetAccount = accounts_1.default.get(from.toLowerCase());
        if (!targetAccount) {
            return (0, helpers_1.resError)(`Unknown account: ${from}`, payload, res);
        }
        const currentAccount = accounts_1.default.current();
        if (!currentAccount || !(0, account_1.hasAddress)(currentAccount, targetAccount.id)) {
            return (0, helpers_1.resError)('Sign request is not from currently selected account', payload, res);
        }
        const signerType = (0, signer_1.getSignerType)(targetAccount.lastSignerType);
        // check for signers that only support signing a specific version of typed data
        if (version !== eth_sig_util_1.SignTypedDataVersion.V4 &&
            signerType &&
            [signer_1.Type.Ledger, signer_1.Type.Trezor].includes(signerType)) {
            const signerName = (0, utils_1.capitalize)(signerType);
            return (0, helpers_1.resError)(`${signerName} only supports eth_signTypedData_v4+`, payload, res);
        }
        if (![eth_sig_util_1.SignTypedDataVersion.V3, eth_sig_util_1.SignTypedDataVersion.V4].includes(version) &&
            signerType === signer_1.Type.Lattice) {
            return (0, helpers_1.resError)('Lattice only supports eth_signTypedData_v3+', payload, res);
        }
        const handlerId = this.addRequestHandler(res);
        const typedMessage = {
            data: typedData,
            version
        };
        const type = sigParser.identify(typedMessage);
        const req = {
            handlerId,
            type: 'signTypedData',
            typedMessage,
            payload,
            account: targetAccount.address,
            origin: payload._origin
        };
        // TODO: all of this below code to construct the original request can be added to
        // a module like the above sigparser which, instead of identifying the request, creates it
        if (type === 'signErc20Permit') {
            const { message: { deadline, spender: spenderAddress, value, owner, nonce }, domain: { verifyingContract: contractAddress, chainId } } = typedMessage.data;
            const permitRequest = {
                ...req,
                type: 'signErc20Permit',
                typedMessage: {
                    data: typedMessage.data,
                    version: eth_sig_util_1.SignTypedDataVersion.V4
                },
                permit: {
                    deadline,
                    value,
                    owner,
                    chainId,
                    nonce,
                    spender: {
                        address: spenderAddress,
                        ens: '',
                        type: ''
                    },
                    verifyingContract: {
                        address: contractAddress,
                        ens: '',
                        type: ''
                    }
                },
                tokenData: {
                    name: '',
                    symbol: ''
                }
            };
            accounts_1.default.addRequest(permitRequest);
        }
        else {
            accounts_1.default.addRequest(req);
        }
    }
    subscribe(payload, res) {
        electron_log_1.default.debug('provider subscribe', { payload });
        const subId = this.createSubscription(payload);
        res({ id: payload.id, jsonrpc: '2.0', result: subId });
    }
    createSubscription(payload) {
        const subId = (0, util_1.addHexPrefix)(crypto_1.default.randomBytes(16).toString('hex'));
        const subscriptionType = payload.params[0];
        this.subscriptions[subscriptionType] = this.subscriptions[subscriptionType] || [];
        this.subscriptions[subscriptionType].push({ id: subId, originId: payload._origin });
        return subId;
    }
    ifSubRemove(id) {
        return Object.keys(this.subscriptions).some((type) => {
            const subscriptionType = type;
            const index = this.subscriptions[subscriptionType].findIndex((sub) => sub.id === id);
            return index > -1 && this.subscriptions[subscriptionType].splice(index, 1);
        });
    }
    clientVersion(payload, res) {
        res({ id: payload.id, jsonrpc: '2.0', result: `Frame/v${package_json_1.default.version}` });
    }
    switchEthereumChain(payload, res) {
        try {
            const params = payload.params;
            if (!params || !params[0])
                throw new Error('Params not supplied');
            const chainId = parseInt(params[0].chainId);
            if (!Number.isInteger(chainId))
                throw new Error('Invalid chain id');
            // Check if chain exists
            const exists = Boolean((0, store_1.default)('main.networks.ethereum', chainId));
            if (!exists) {
                const err = { message: 'Chain does not exist', code: 4902 };
                return (0, helpers_1.resError)(err, payload, res);
            }
            const originId = payload._origin;
            const origin = getPayloadOrigin(payload);
            if (origin.chain.id !== chainId) {
                store_1.default.switchOriginChain(originId, chainId, origin.chain.type);
            }
            return res({ id: payload.id, jsonrpc: '2.0', result: null });
        }
        catch (e) {
            return (0, helpers_1.resError)(e, payload, res);
        }
    }
    addEthereumChain(payload, res) {
        if (!payload.params[0])
            return (0, helpers_1.resError)('addChain request missing params', payload, res);
        const type = 'ethereum';
        const { chainId, chainName, nativeCurrency, rpcUrls = [], blockExplorerUrls = [] } = payload.params[0];
        if (!chainId)
            return (0, helpers_1.resError)('addChain request missing chainId', payload, res);
        if (!chainName)
            return (0, helpers_1.resError)('addChain request missing chainName', payload, res);
        if (!nativeCurrency)
            return (0, helpers_1.resError)('addChain request missing nativeCurrency', payload, res);
        const handlerId = this.addRequestHandler(res);
        // Check if chain exists
        const id = parseInt(chainId, 16);
        if (!Number.isInteger(id))
            return (0, helpers_1.resError)('Invalid chain id', payload, res);
        const exists = Boolean((0, store_1.default)('main.networks', type, id));
        if (exists) {
            // Ask user if they want to switch chains
            this.switchEthereumChain(payload, res);
        }
        else {
            // Ask user if they want to add this chain
            accounts_1.default.addRequest({
                handlerId,
                type: 'addChain',
                chain: {
                    type,
                    id,
                    name: chainName,
                    symbol: nativeCurrency.symbol,
                    primaryRpc: rpcUrls[0],
                    secondaryRpc: rpcUrls[1],
                    explorer: blockExplorerUrls[0],
                    nativeCurrencyName: nativeCurrency.name
                },
                account: (accounts_1.default.getAccounts() || [])[0],
                origin: payload._origin,
                payload
            }, res);
        }
    }
    addCustomToken(payload, cb, targetChain) {
        const { type, options: tokenData } = (payload.params || {});
        if ((type || '').toLowerCase() !== 'erc20') {
            return (0, helpers_1.resError)('only ERC-20 tokens are supported', payload, cb);
        }
        this.getChainId(payload, (resp) => {
            if (resp.error) {
                return (0, helpers_1.resError)(resp.error, payload, cb);
            }
            const chainId = parseInt(resp.result);
            const address = (tokenData.address || '').toLowerCase();
            const symbol = (tokenData.symbol || '').toUpperCase();
            const decimals = parseInt(tokenData.decimals || '1');
            if (!address) {
                return (0, helpers_1.resError)('tokens must define an address', payload, cb);
            }
            const res = () => {
                cb({ id: payload.id, jsonrpc: '2.0', result: true });
            };
            // don't attempt to add the token if it's already been added
            const tokenExists = (0, store_1.default)('main.tokens.custom').some((token) => token.chainId === chainId && token.address === address);
            if (tokenExists) {
                return res();
            }
            const token = {
                chainId,
                name: tokenData.name || (0, utils_1.capitalize)(symbol),
                address,
                symbol,
                decimals,
                logoURI: tokenData.image || tokenData.logoURI || ''
            };
            const handlerId = this.addRequestHandler(res);
            accounts_1.default.addRequest({
                handlerId,
                type: 'addToken',
                token,
                account: accounts_1.default.current().id,
                origin: payload._origin,
                payload
            }, res);
        }, targetChain);
    }
    parseTargetChain(payload) {
        if ('chainId' in payload) {
            const chainId = parseInt(payload.chainId || '', 16);
            const chainConnection = this.connection.connections['ethereum'][chainId] || {};
            return chainConnection.chainConfig && { type: 'ethereum', id: chainId };
        }
        return getPayloadOrigin(payload).chain;
    }
    getChains(payload, res) {
        res({ id: payload.id, jsonrpc: payload.jsonrpc, result: (0, chains_2.getActiveChains)() });
    }
    getAssets(payload, currentAccount, cb) {
        if (!currentAccount)
            return (0, helpers_1.resError)('no account selected', payload, cb);
        try {
            const { nativeCurrency, erc20 } = (0, assets_1.loadAssets)(currentAccount.id);
            const { id, jsonrpc } = payload;
            return cb({ id, jsonrpc, result: { nativeCurrency, erc20 } });
        }
        catch (e) {
            return (0, helpers_1.resError)({ message: e.message, code: 5901 }, payload, cb);
        }
    }
    sendAsync(payload, cb) {
        this.send(payload, (res) => {
            if (res.error) {
                const errMessage = res.error.message || `sendAsync error did not have message`;
                cb(new Error(errMessage));
            }
            else {
                cb(null, res);
            }
        });
    }
    send(requestPayload, res = () => { }) {
        // TODO: in the future this mapping will happen in the requests module so that the handler only ever
        // has to worry about one shape of request, error handling for each request type will happen
        // in the request handler for each type of request
        let payload;
        try {
            payload = (0, requests_1.mapRequest)(requestPayload);
        }
        catch (e) {
            return (0, helpers_1.resError)({ message: e.message }, requestPayload, res);
        }
        const method = payload.method || '';
        // method handlers that are not chain-specific can go here, before parsing the target chain
        if (method === 'eth_unsubscribe' && this.ifSubRemove(payload.params[0]))
            return res({ id: payload.id, jsonrpc: '2.0', result: true }); // Subscription was ours
        const targetChain = this.parseTargetChain(payload);
        if (!targetChain) {
            electron_log_1.default.warn('received request with unknown chain', JSON.stringify(payload));
            return (0, helpers_1.resError)({ message: `unknown chain: ${payload.chainId}`, code: 4901 }, payload, res);
        }
        function getAccounts(payload, res) {
            res({
                id: payload.id,
                jsonrpc: payload.jsonrpc,
                result: accounts_1.default.getSelectedAddresses().map((a) => a.toLowerCase())
            });
        }
        function getCoinbase(payload, res) {
            accounts_1.default.getAccounts((err, accounts) => {
                if (err)
                    return (0, helpers_1.resError)(`signTransaction Error: ${JSON.stringify(err)}`, payload, res);
                res({ id: payload.id, jsonrpc: payload.jsonrpc, result: (accounts || [])[0] });
            });
        }
        if (method === 'eth_coinbase')
            return getCoinbase(payload, res);
        if (method === 'eth_accounts')
            return getAccounts(payload, res);
        if (method === 'eth_requestAccounts')
            return getAccounts(payload, res);
        if (method === 'eth_sendTransaction')
            return this.sendTransaction(payload, res, targetChain);
        if (method === 'eth_getTransactionByHash')
            return this.getTransactionByHash(payload, res, targetChain);
        if (method === 'personal_ecRecover')
            return (0, helpers_1.ecRecover)(payload, res);
        if (method === 'web3_clientVersion')
            return this.clientVersion(payload, res);
        if (method === 'eth_subscribe' && payload.params[0] in this.subscriptions) {
            return this.subscribe(payload, res);
        }
        if (method === 'personal_sign')
            return this._personalSign(payload, res);
        if (method === 'eth_sign')
            return this.sign(payload, res);
        if (['eth_signTypedData', 'eth_signTypedData_v1', 'eth_signTypedData_v3', 'eth_signTypedData_v4'].includes(method)) {
            const underscoreIndex = method.lastIndexOf('_');
            const version = (underscoreIndex > 3 ? method.substring(underscoreIndex + 1).toUpperCase() : undefined);
            return this.signTypedData(payload, version, res);
        }
        if (method === 'wallet_addEthereumChain')
            return this.addEthereumChain(payload, res);
        if (method === 'wallet_switchEthereumChain')
            return this.switchEthereumChain(payload, res);
        if (method === 'wallet_getPermissions')
            return (0, helpers_1.getPermissions)(payload, res);
        if (method === 'wallet_requestPermissions')
            return (0, helpers_1.requestPermissions)(payload, res);
        if (method === 'wallet_watchAsset')
            return this.addCustomToken(payload, res, targetChain);
        if (method === 'wallet_getEthereumChains')
            return this.getChains(payload, res);
        if (method === 'wallet_getAssets')
            return this.getAssets(payload, accounts_1.default.current(), res);
        // Connection dependent methods need to pass targetChain
        if (method === 'net_version')
            return this.getNetVersion(payload, res, targetChain);
        if (method === 'eth_chainId')
            return this.getChainId(payload, res, targetChain);
        // remove custom data
        const { _origin, chainId, ...rpcPayload } = payload;
        // Pass everything else to our connection
        this.connection.send(rpcPayload, res, targetChain);
    }
    emit(type, ...args) {
        return super.emit(type, ...args);
    }
}
exports.Provider = Provider;
const provider = new Provider();
store_1.default.observer((0, chains_2.createChainsObserver)(provider), 'provider:chains');
store_1.default.observer((0, chains_2.createOriginChainObserver)(provider), 'provider:origins');
store_1.default.observer((0, assets_1.createObserver)(provider), 'provider:assets');
exports.default = provider;
