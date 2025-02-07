import { Plugin } from "@elizaos/core";
import { taikoWalletProvider } from "./providers/wallet";
import { transferAction } from "./actions/transfer";
import { balanceAction } from "./actions/balance";
import { onchainAnalyticsAction } from "./actions/onchainAnalytics";

export const taikoPlugin: Plugin = {
    name: "taiko",
    description: "Taiko plugin for Eliza",
    actions: [transferAction, onchainAnalyticsAction, balanceAction],
    evaluators: [],
    providers: [taikoWalletProvider],
};
export default taikoPlugin;
