import {
    composeContext,
    elizaLogger,
    generateObjectDeprecated,
    type HandlerCallback,
    ModelClass,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";

import { onchainAnalyticsTemplate } from "../templates";
import { OnchainAnalyticsAction } from "../services/onchainAnalytics";
import { validateTaikoConfig } from "../environment";
import { formatAnalysisResults } from "../utils";

export const onchainAnalyticsAction = {
    name: "onchainAnalytics",
    description:
        "Gives an overview of a given address in terms onchain activity.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: Record<string, unknown>,
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Starting a onchain analytics research action");

        const context = composeContext({
            state: state,
            template: onchainAnalyticsTemplate,
        });
        const content = await generateObjectDeprecated({
            runtime,
            context,
            modelClass: ModelClass.LARGE,
        });
        const config = await validateTaikoConfig(runtime);
        const action = new OnchainAnalyticsAction(config.GOLDRUSH_API_KEY);
        const paramOptions: any = {
            chainName: content.chain,
            contractAddress: content.contractAddress,
        };

        try {
            const resp = await action.getOnchainAnalytics(paramOptions);
            callback?.({
                text: `Here you go,\n ${formatAnalysisResults(resp)}`,
                content: { ...resp },
            });

            return true;
        } catch (error) {
            elizaLogger.error(
                "Error during fetching analytics:",
                error.message
            );
            callback?.({
                text: `Analytics Process failed: ${error.message}`,
                content: { error: error.message },
            });
            return false;
        }
    },
    template: onchainAnalyticsTemplate,
    validate: async (runtime: IAgentRuntime) => {
        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Show some contract metrics for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll find out and show the contract metrics for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                    action: "ONCHAIN_ANALYTICS",
                    content: {
                        chain: "taiko",
                        contractAddress:
                            "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                    },
                },
            },
        ],

        [
            {
                user: "{{user1}}",
                content: {
                    text: "Tell me about this contract 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll find the metrics for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e on Taiko",
                    action: "ONCHAIN_ANALYTICS",
                    content: {
                        chain: "taiko",
                        contractAddress:
                            "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                    },
                },
            },
        ],
    ],
    similes: [
        "ONCHAIN_ANALYTICS",
        "GET_CONTRACT_ANALYTICS",
        "GAS_SPENT",
        "TOTAL_TRANSACTIONS",
    ],
};
