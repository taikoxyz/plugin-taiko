import { erc20Abi, formatEther, formatUnits } from "viem";
import { WalletProvider } from "../providers/wallet";
import { GetBalanceParams, GetBalanceResponse } from "../types";

export class BalanceAction {
    constructor(private walletProvider: WalletProvider) {}

    async balance(params: GetBalanceParams): Promise<GetBalanceResponse> {
        try {
            if (!params.address) {
                throw new Error("No address provided.");
            }

            const { chain, token } = params;
            const targetAddress = await this.walletProvider.formatAddress(
                params.address
            );
            const nativeToken =
                this.walletProvider.chains[chain].nativeCurrency.symbol;

            this.walletProvider.switchChain(chain);

            const publicClient = this.walletProvider.getPublicClient(chain);

            const response: GetBalanceResponse = {
                chain,
                address: targetAddress,
                balance: await this.fetchBalance({
                    publicClient,
                    token,
                    nativeToken,
                    targetAddress,
                    chain,
                }),
            };

            return response;
        } catch (error) {
            throw new Error(`Failed to fetch balance: ${error.message}`);
        }
    }

    private async fetchBalance({
        publicClient,
        token,
        nativeToken,
        targetAddress,
        chain,
    }) {
        if (!token || token === "null" || token === nativeToken) {
            const nativeBalanceWei = await publicClient.getBalance({
                address: targetAddress,
            });
            return {
                token: nativeToken,
                amount: formatEther(nativeBalanceWei),
            };
        }

        const tokenAddress = token.startsWith("0x")
            ? token
            : await this.walletProvider.getTokenAddress(chain, token);

        const [balance, decimals] = await Promise.all([
            publicClient.readContract({
                address: tokenAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [targetAddress],
            }),
            publicClient.readContract({
                address: tokenAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: "decimals",
            }),
        ]);

        return {
            token,
            amount: formatUnits(balance, decimals),
        };
    }
}
