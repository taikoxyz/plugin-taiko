import type { IAgentRuntime, Provider, Memory, State } from "@elizaos/core";
import type {
    Address,
    WalletClient,
    PublicClient,
    Chain,
    HttpTransport,
    Account,
    PrivateKeyAccount,
    Hex,
    ByteArray,
} from "viem";
import {
    createPublicClient,
    createWalletClient,
    erc20Abi,
    formatUnits,
    http,
} from "viem";
import { getToken } from "@lifi/sdk";
import { createWeb3Name } from "@web3-name-sdk/core";
import { privateKeyToAccount } from "viem/accounts";
import * as viemChains from "viem/chains";

import type { SupportedChain } from "../types";

export class WalletProvider {
    private currentChain: SupportedChain = "taiko";
    chains: Record<string, Chain> = {
        taiko: viemChains.taiko,
        taikoHekla: viemChains.taikoHekla,
    };
    account: PrivateKeyAccount;

    constructor(privateKey: `0x${string}`, chains?: Record<string, Chain>) {
        this.setAccount(privateKey);
        this.setChains(chains);

        if (chains && Object.keys(chains).length > 0) {
            this.setCurrentChain(Object.keys(chains)[0] as SupportedChain);
        }
    }

    getAccount(): PrivateKeyAccount {
        return this.account;
    }

    getAddress(): Address {
        return this.account.address;
    }

    getCurrentChain(): Chain {
        return this.chains[this.currentChain];
    }

    getPublicClient(
        chainName: SupportedChain
    ): PublicClient<HttpTransport, Chain, Account | undefined> {
        const transport = this.createHttpTransport(chainName);

        const publicClient = createPublicClient({
            chain: this.chains[chainName],
            transport,
        });
        return publicClient;
    }

    getWalletClient(chainName: SupportedChain): WalletClient {
        const transport = this.createHttpTransport(chainName);

        const walletClient = createWalletClient({
            chain: this.chains[chainName],
            transport,
            account: this.account,
        });

        return walletClient;
    }

    getChainConfigs(chainName: SupportedChain): Chain {
        const chain = viemChains[chainName];

        if (!chain?.id) {
            throw new Error("Invalid chain name");
        }

        return chain;
    }

    async getBalance(): Promise<string> {
        const client = this.getPublicClient(this.currentChain);
        const balance = await client.getBalance({
            address: this.account.address,
        });
        return formatUnits(balance, 18);
    }

    addChain(chain: Record<string, Chain>) {
        this.setChains(chain);
    }

    switchChain(chainName: SupportedChain, customRpcUrl?: string) {
        if (!this.chains[chainName]) {
            const chain = WalletProvider.genChainFromName(
                chainName,
                customRpcUrl
            );
            this.addChain({ [chainName]: chain });
        }
        this.setCurrentChain(chainName);
    }

    async formatAddress(address: string): Promise<Address> {
        if (!address || address.length === 0) {
            throw new Error("Empty address");
        }

        if (address.startsWith("0x") && address.length === 42) {
            return address as Address;
        }

        const resolvedAddress = await this.resolveWeb3Name(address);
        if (resolvedAddress) {
            return resolvedAddress as Address;
        }
        throw new Error("Invalid address");
    }

    async resolveWeb3Name(name: string): Promise<string | null> {
        const nameService = createWeb3Name();
        return await nameService.getAddress(name);
    }

    async getTokenAddress(
        chainName: SupportedChain,
        tokenSymbol: string
    ): Promise<string> {
        const token = await getToken(
            this.getChainConfigs(chainName).id,
            tokenSymbol
        );
        return token.address;
    }

    async transfer(
        chain: SupportedChain,
        toAddress: Address,
        amount: bigint,
        options?: {
            gas?: bigint;
            gasPrice?: bigint;
            data?: Hex;
        }
    ): Promise<Hex> {
        const walletClient = this.getWalletClient(chain);
        return await walletClient.sendTransaction({
            account: this.account,
            to: toAddress,
            value: amount,
            chain: this.getChainConfigs(chain),
            kzg: {
                blobToKzgCommitment: (_: ByteArray): ByteArray => {
                    throw new Error("Function not implemented.");
                },
                computeBlobKzgProof: (
                    _blob: ByteArray,
                    _commitment: ByteArray
                ): ByteArray => {
                    throw new Error("Function not implemented.");
                },
            },
            ...options,
        });
    }

    async transferERC20(
        chain: SupportedChain,
        tokenAddress: Address,
        toAddress: Address,
        amount: bigint,
        options?: {
            gas?: bigint;
            gasPrice?: bigint;
        }
    ): Promise<Hex> {
        const publicClient = this.getPublicClient(chain);
        const walletClient = this.getWalletClient(chain);
        const { request } = await publicClient.simulateContract({
            account: this.account,
            address: tokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: "transfer",
            args: [toAddress as `0x${string}`, amount],
            ...options,
        });

        return await walletClient.writeContract(request);
    }

    private setAccount = (pk: `0x${string}`) => {
        this.account = privateKeyToAccount(pk);
    };

    private setChains = (chains?: Record<string, Chain>) => {
        if (!chains) {
            return;
        }
        for (const chain of Object.keys(chains)) {
            this.chains[chain] = chains[chain];
        }
    };

    private setCurrentChain = (chain: SupportedChain) => {
        this.currentChain = chain;
    };

    private createHttpTransport = (chainName: SupportedChain) => {
        const chain = this.chains[chainName];

        if (chain.rpcUrls.custom) {
            return http(chain.rpcUrls.custom.http[0]);
        }
        return http(chain.rpcUrls.default.http[0]);
    };

    static genChainFromName(
        chainName: string,
        customRpcUrl?: string | null
    ): Chain {
        const baseChain = viemChains[chainName];

        if (!baseChain?.id) {
            throw new Error("Invalid chain name");
        }

        const viemChain: Chain = customRpcUrl
            ? {
                  ...baseChain,
                  rpcUrls: {
                      ...baseChain.rpcUrls,
                      custom: {
                          http: [customRpcUrl],
                      },
                  },
              }
            : baseChain;

        return viemChain;
    }
}

const genChainsFromRuntime = (
    runtime: IAgentRuntime
): Record<string, Chain> => {
    const chainNames = ["taiko", "taikoHekla"];
    const chains = {};

    for (const chainName of chainNames) {
        const chain = WalletProvider.genChainFromName(chainName);
        chains[chainName] = chain;
    }
    const mainnet_rpcurl = runtime.getSetting("TAIKO_PROVIDER_URL");
    if (mainnet_rpcurl) {
        const chain = WalletProvider.genChainFromName("taiko", mainnet_rpcurl);
        chains["taiko"] = chain;
    }

    return chains;
};

export const initWalletProvider = (runtime: IAgentRuntime) => {
    const privateKey = runtime.getSetting("TAIKO_PRIVATE_KEY");
    if (!privateKey) {
        throw new Error("TAIKO_PRIVATE_KEY is missing");
    }

    const chains = genChainsFromRuntime(runtime);

    return new WalletProvider(privateKey as `0x${string}`, chains);
};

export const taikoWalletProvider: Provider = {
    async get(
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<string | null> {
        try {
            const walletProvider = initWalletProvider(runtime);
            const address = walletProvider.getAddress();
            const balance = await walletProvider.getBalance();
            const chain = walletProvider.getCurrentChain();
            return `Taiko chain Wallet Address: ${address}\nBalance: ${balance} ${chain.nativeCurrency.symbol}\nChain ID: ${chain.id}, Name: ${chain.name}`;
        } catch (error) {
            console.error("Error in Taiko chain wallet provider:", error);
            return null;
        }
    },
};
