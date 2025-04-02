"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGasCalculator = void 0;
const util_1 = require("@ethereumjs/util");
const chains_1 = require("../../../resources/utils/chains");
function feesToHex(fees) {
    return {
        nextBaseFee: (0, util_1.intToHex)(fees.nextBaseFee),
        maxBaseFeePerGas: (0, util_1.intToHex)(fees.maxBaseFeePerGas),
        maxPriorityFeePerGas: (0, util_1.intToHex)(fees.maxPriorityFeePerGas),
        maxFeePerGas: (0, util_1.intToHex)(fees.maxFeePerGas)
    };
}
function calculateReward(blocks, opts = {}) {
    const recentBlocks = 10;
    const { percentileBand = 0, averageMethod = 'median' } = opts;
    const allBlocks = blocks.length;
    // these strategies will be tried in descending order until one finds
    // at least 1 eligible block from which to calculate the reward
    const rewardCalculationStrategies = [
        // use recent blocks that weren't almost empty or almost full
        { minRatio: 0.1, maxRatio: 0.9, blockSampleSize: recentBlocks },
        // include recent blocks that were full
        { minRatio: 0.1, maxRatio: 1.05, blockSampleSize: recentBlocks },
        // use the entire block sample but still limit to blocks that were not almost empty
        { minRatio: 0.1, maxRatio: 1.05, blockSampleSize: allBlocks },
        // use any recent block with transactions
        { minRatio: 0, maxRatio: Number.MAX_SAFE_INTEGER, blockSampleSize: recentBlocks },
        // use any block with transactions
        { minRatio: 0, maxRatio: Number.MAX_SAFE_INTEGER, blockSampleSize: allBlocks }
    ];
    const eligibleRewardsBlocks = rewardCalculationStrategies.reduce((foundBlocks, strategy) => {
        if (foundBlocks.length === 0) {
            const blockSample = blocks.slice(blocks.length - Math.min(strategy.blockSampleSize, blocks.length));
            const eligibleBlocks = blockSample.filter((block) => block.gasUsedRatio > strategy.minRatio && block.gasUsedRatio <= strategy.maxRatio);
            if (eligibleBlocks.length > 0)
                return eligibleBlocks;
        }
        return foundBlocks;
    }, []);
    if (averageMethod === 'average') {
        return Math.floor(eligibleRewardsBlocks
            .map((block) => block.rewards[Math.min(percentileBand, block.rewards.length - 1)])
            .reduce((sum, reward) => sum + reward, 0) / eligibleRewardsBlocks.length);
    }
    else {
        // use the median reward from the block sample or use the fee from the last block as a last resort
        const lastBlockFee = blocks[blocks.length - 1].rewards[0];
        return (eligibleRewardsBlocks
            .map((block) => block.rewards[Math.min(percentileBand, block.rewards.length - 1)])
            .sort()[Math.floor(eligibleRewardsBlocks.length / 2)] || lastBlockFee);
    }
}
function estimateGasFees(blocks, opts = {}) {
    // plan for max fee of 2 full blocks, each one increasing the fee by 12.5%
    const nextBlockFee = blocks[blocks.length - 1].baseFee; // base fee for next block
    const calculatedFee = Math.ceil(nextBlockFee * 1.125 * 1.125);
    // the last block contains only the base fee for the next block but no fee history, so
    // don't use it in the block reward calculation
    const medianBlockReward = calculateReward(blocks.slice(0, blocks.length - 1), opts);
    const estimatedGasFees = {
        nextBaseFee: nextBlockFee,
        maxBaseFeePerGas: calculatedFee,
        maxPriorityFeePerGas: medianBlockReward,
        maxFeePerGas: calculatedFee + medianBlockReward
    };
    return estimatedGasFees;
}
function DefaultGasCalculator() {
    return {
        calculateGas: (blocks) => {
            const estimatedGasFees = estimateGasFees(blocks);
            return feesToHex(estimatedGasFees);
        }
    };
}
function PolygonGasCalculator() {
    return {
        calculateGas: (blocks) => {
            const fees = estimateGasFees(blocks);
            const maxPriorityFeePerGas = Math.max(fees.maxPriorityFeePerGas, 30e9);
            return feesToHex({
                ...fees,
                maxPriorityFeePerGas,
                maxFeePerGas: fees.maxBaseFeePerGas + maxPriorityFeePerGas
            });
        }
    };
}
function OpStackGasCalculator() {
    return {
        calculateGas: (blocks) => {
            const estimatedGasFees = estimateGasFees(blocks, { percentileBand: 1, averageMethod: 'average' });
            return feesToHex(estimatedGasFees);
        }
    };
}
function createGasCalculator(chainId) {
    const id = parseInt(chainId);
    // TODO: maybe this can be tied into chain config somehow
    if (id === 137 || id === 80001) {
        // Polygon and Mumbai testnet
        return PolygonGasCalculator();
    }
    if ((0, chains_1.chainUsesOptimismFees)(id)) {
        return OpStackGasCalculator();
    }
    return DefaultGasCalculator();
}
exports.createGasCalculator = createGasCalculator;
