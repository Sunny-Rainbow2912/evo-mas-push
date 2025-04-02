"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@ethereumjs/common");
function chainConfig(chain, hardfork) {
    const chainId = BigInt(chain);
    return common_1.Common.isSupportedChainId(chainId)
        ? new common_1.Common({ chain: chainId, hardfork })
        : common_1.Common.custom({ chainId }, { baseChain: 'mainnet', hardfork });
}
exports.default = chainConfig;
