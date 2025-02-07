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

import { taikoWalletProvider, initWalletProvider } from "../providers/wallet";
import { getBalanceTemplate, transferTemplate } from "../templates";
import type { GetBalanceParams } from "../types";

import { BalanceAction } from "../services/balance";

export const balanceAction = {
    name: "balance",
    description: "retrieve balance of a token for a given address.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: Record<string, unknown>,
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Starting transfer action...");

        // Initialize or update state
        let currentState = state;
        if (!currentState) {
            currentState = (await runtime.composeState(message)) as State;
        } else {
            currentState = await runtime.updateRecentMessageState(currentState);
        }
        state.walletInfo = await taikoWalletProvider.get(
            runtime,
            message,
            currentState
        );

        const balanceContext = composeContext({
            state: currentState,
            template: getBalanceTemplate,
        });
        const content = await generateObjectDeprecated({
            runtime,
            context: balanceContext,
            modelClass: ModelClass.LARGE,
        });

        const walletProvider = initWalletProvider(runtime);
        const action = new BalanceAction(walletProvider);
        const paramOptions: GetBalanceParams = {
            chain: content.chain,
            token: content.token,
            address: content.address,
        };

        try {
            const resp = await action.balance(paramOptions);
            callback?.({
                text: `${resp.address} has ${resp.balance.amount} ${
                    resp.balance.token
                } in ${resp.chain === "taikoHekla" ? "Taiko Hekla" : "Taiko"}.`,
                content: { ...resp },
            });

            return true;
        } catch (error) {
            elizaLogger.error("Error during fetching balance:", error.message);
            callback?.({
                text: `Fetching failed: ${error.message}`,
                content: { error: error.message },
            });
            return false;
        }
    },
    template: transferTemplate,
    validate: async (runtime: IAgentRuntime) => {
        const privateKey = runtime.getSetting("TAIKO_PRIVATE_KEY");
        return typeof privateKey === "string" && privateKey.startsWith("0x");
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "How much USDC does siddesh.eth have in Taiko?",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll find how much USDC does siddesh.eth have in Taiko",
                    action: "GET_BALANCE",
                    content: {
                        chain: "taiko",
                        token: "USDC",
                        address: "siddesh.eth",
                    },
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Tell how many ETH does 0x742d35Cc6634C0532925a3b844Bc454e4438f44e have in Taiko Hekla.",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Sure, Let me find the balance of ETH for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e on Taiko Hekla",
                    action: "GET_BALANCE",
                    content: {
                        chain: "taikoHekla",
                        token: "ETH",
                        address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                    },
                },
            },
        ],
    ],
    similes: ["GET_BALANCE", "BALANCE"],
};
