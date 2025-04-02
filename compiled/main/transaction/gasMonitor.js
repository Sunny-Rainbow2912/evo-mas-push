"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("@ethereumjs/util");
class GasMonitor {
    constructor(connection /* Chains */) {
        this.connection = connection;
    }
    async getFeeHistory(numBlocks, rewardPercentiles, newestBlock = 'pending') {
        const blockCount = (0, util_1.intToHex)(numBlocks);
        const payload = { method: 'eth_feeHistory', params: [blockCount, newestBlock, rewardPercentiles] };
        const feeHistory = await this.connection.send(payload);
        const feeHistoryBlocks = feeHistory.baseFeePerGas.map((baseFee, i) => {
            return {
                baseFee: parseInt(baseFee, 16),
                gasUsedRatio: feeHistory.gasUsedRatio[i],
                rewards: (feeHistory.reward[i] || []).map((reward) => parseInt(reward, 16))
            };
        });
        return feeHistoryBlocks;
    }
    async getGasPrices() {
        const gasPrice = await this.connection.send({ method: 'eth_gasPrice' });
        // in the future we may want to have specific calculators to calculate variations
        // in the gas price or eliminate this structure altogether
        return {
            slow: gasPrice,
            standard: gasPrice,
            fast: gasPrice,
            asap: gasPrice
        };
    }
}
exports.default = GasMonitor;
