import { WalletProvider } from "../providers/wallet";

import type { TransferParams, TransferResponse } from "../types";
import {
    erc20Abi,
    formatEther,
    formatUnits,
    parseEther,
    parseUnits,
} from "viem";

export class TransferAction {
    constructor(private walletProvider: WalletProvider) {}

    async transfer(params: TransferParams): Promise<TransferResponse> {
        console.log("Initiating a transfer transaction in Taiko:", params);

        // Validate required parameters
        if (!params.toAddress) {
            throw new Error("Recipient address is missing");
        }
        if (!params.chain) {
            throw new Error("Chain parameter is missing");
        }
        if (params.amount && isNaN(Number(params.amount))) {
            throw new Error("Invalid amount provided");
        }

        const toAddress = await this.walletProvider.formatAddress(
            params.toAddress
        );
        const fromAddress = this.walletProvider.getAddress();

        this.walletProvider.switchChain(params.chain);

        const nativeToken =
            this.walletProvider.chains[params.chain].nativeCurrency.symbol;

        const resp: TransferResponse = {
            chain: params.chain,
            txHash: "0x",
            recipient: toAddress,
            amount: "",
            token: params.token === "null" ? null : params.token ?? nativeToken,
        };

        try {
            if (
                !params.token ||
                params.token === "null" ||
                params.token === nativeToken
            ) {
                await this.handleNativeTransfer(params, toAddress, resp);
            } else {
                await this.handleERC20Transfer(
                    params,
                    fromAddress,
                    toAddress,
                    resp
                );
            }

            if (!resp.txHash || resp.txHash === "0x") {
                throw new Error("Transaction hash is invalid");
            }

            return resp;
        } catch (error) {
            throw new Error(`Transfer failed: ${error.message}`);
        }
    }

    private async handleNativeTransfer(
        params: TransferParams,
        toAddress: string,
        resp: TransferResponse
    ): Promise<void> {
        if (!params.amount) {
            throw new Error("Amount is required for native token transfer");
        }
        const value = parseEther(params.amount);
        resp.amount = formatEther(value);
        resp.txHash = await this.walletProvider.transfer(
            params.chain,
            toAddress as `0x${string}`,
            value
        );
    }

    private async handleERC20Transfer(
        params: TransferParams,
        fromAddress: string,
        toAddress: string,
        resp: TransferResponse
    ): Promise<void> {
        const tokenAddress = params.token.startsWith("0x")
            ? params.token
            : await this.walletProvider.getTokenAddress(
                  params.chain,
                  params.token
              );

        const publicClient = this.walletProvider.getPublicClient(params.chain);
        const decimals = await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: "decimals",
        });

        const value = await this.getERC20TransferAmount(
            publicClient,
            tokenAddress,
            fromAddress,
            params.amount,
            decimals
        );

        resp.amount = formatUnits(value, decimals);
        resp.txHash = await this.walletProvider.transferERC20(
            params.chain,
            tokenAddress as `0x${string}`,
            toAddress as `0x${string}`,
            value
        );
    }

    private async getERC20TransferAmount(
        publicClient: any,
        tokenAddress: string,
        fromAddress: string,
        amount: string | undefined,
        decimals: number
    ): Promise<bigint> {
        if (!amount) {
            return await publicClient.readContract({
                address: tokenAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [fromAddress],
            });
        }
        return parseUnits(amount, decimals);
    }
}
