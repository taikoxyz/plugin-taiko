// src/providers/wallet.ts
import {
  createPublicClient,
  createWalletClient,
  erc20Abi,
  formatUnits,
  http
} from "viem";
import { getToken } from "@lifi/sdk";
import { createWeb3Name } from "@web3-name-sdk/core";
import { privateKeyToAccount } from "viem/accounts";
import * as viemChains from "viem/chains";
var WalletProvider = class _WalletProvider {
  currentChain = "taiko";
  chains = {
    taiko: viemChains.taiko,
    taikoHekla: viemChains.taikoHekla
  };
  account;
  constructor(privateKey, chains) {
    this.setAccount(privateKey);
    this.setChains(chains);
    if (chains && Object.keys(chains).length > 0) {
      this.setCurrentChain(Object.keys(chains)[0]);
    }
  }
  getAccount() {
    return this.account;
  }
  getAddress() {
    return this.account.address;
  }
  getCurrentChain() {
    return this.chains[this.currentChain];
  }
  getPublicClient(chainName) {
    const transport = this.createHttpTransport(chainName);
    const publicClient = createPublicClient({
      chain: this.chains[chainName],
      transport
    });
    return publicClient;
  }
  getWalletClient(chainName) {
    const transport = this.createHttpTransport(chainName);
    const walletClient = createWalletClient({
      chain: this.chains[chainName],
      transport,
      account: this.account
    });
    return walletClient;
  }
  getChainConfigs(chainName) {
    const chain = viemChains[chainName];
    if (!chain?.id) {
      throw new Error("Invalid chain name");
    }
    return chain;
  }
  async getBalance() {
    const client = this.getPublicClient(this.currentChain);
    const balance = await client.getBalance({
      address: this.account.address
    });
    return formatUnits(balance, 18);
  }
  addChain(chain) {
    this.setChains(chain);
  }
  switchChain(chainName, customRpcUrl) {
    if (!this.chains[chainName]) {
      const chain = _WalletProvider.genChainFromName(
        chainName,
        customRpcUrl
      );
      this.addChain({ [chainName]: chain });
    }
    this.setCurrentChain(chainName);
  }
  async formatAddress(address) {
    if (!address || address.length === 0) {
      throw new Error("Empty address");
    }
    if (address.startsWith("0x") && address.length === 42) {
      return address;
    }
    const resolvedAddress = await this.resolveWeb3Name(address);
    if (resolvedAddress) {
      return resolvedAddress;
    }
    throw new Error("Invalid address");
  }
  async resolveWeb3Name(name) {
    const nameService = createWeb3Name();
    return await nameService.getAddress(name);
  }
  async getTokenAddress(chainName, tokenSymbol) {
    const token = await getToken(
      this.getChainConfigs(chainName).id,
      tokenSymbol
    );
    return token.address;
  }
  async transfer(chain, toAddress, amount, options) {
    const walletClient = this.getWalletClient(chain);
    return await walletClient.sendTransaction({
      account: this.account,
      to: toAddress,
      value: amount,
      chain: this.getChainConfigs(chain),
      kzg: {
        blobToKzgCommitment: (_) => {
          throw new Error("Function not implemented.");
        },
        computeBlobKzgProof: (_blob, _commitment) => {
          throw new Error("Function not implemented.");
        }
      },
      ...options
    });
  }
  async transferERC20(chain, tokenAddress, toAddress, amount, options) {
    const publicClient = this.getPublicClient(chain);
    const walletClient = this.getWalletClient(chain);
    const { request } = await publicClient.simulateContract({
      account: this.account,
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "transfer",
      args: [toAddress, amount],
      ...options
    });
    return await walletClient.writeContract(request);
  }
  setAccount = (pk) => {
    this.account = privateKeyToAccount(pk);
  };
  setChains = (chains) => {
    if (!chains) {
      return;
    }
    for (const chain of Object.keys(chains)) {
      this.chains[chain] = chains[chain];
    }
  };
  setCurrentChain = (chain) => {
    this.currentChain = chain;
  };
  createHttpTransport = (chainName) => {
    const chain = this.chains[chainName];
    if (chain.rpcUrls.custom) {
      return http(chain.rpcUrls.custom.http[0]);
    }
    return http(chain.rpcUrls.default.http[0]);
  };
  static genChainFromName(chainName, customRpcUrl) {
    const baseChain = viemChains[chainName];
    if (!baseChain?.id) {
      throw new Error("Invalid chain name");
    }
    const viemChain = customRpcUrl ? {
      ...baseChain,
      rpcUrls: {
        ...baseChain.rpcUrls,
        custom: {
          http: [customRpcUrl]
        }
      }
    } : baseChain;
    return viemChain;
  }
};
var genChainsFromRuntime = (runtime) => {
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
var initWalletProvider = (runtime) => {
  const privateKey = runtime.getSetting("TAIKO_PRIVATE_KEY");
  if (!privateKey) {
    throw new Error("TAIKO_PRIVATE_KEY is missing");
  }
  const chains = genChainsFromRuntime(runtime);
  return new WalletProvider(privateKey, chains);
};
var taikoWalletProvider = {
  async get(runtime, _message, _state) {
    try {
      const walletProvider = initWalletProvider(runtime);
      const address = walletProvider.getAddress();
      const balance = await walletProvider.getBalance();
      const chain = walletProvider.getCurrentChain();
      return `Taiko chain Wallet Address: ${address}
Balance: ${balance} ${chain.nativeCurrency.symbol}
Chain ID: ${chain.id}, Name: ${chain.name}`;
    } catch (error) {
      console.error("Error in Taiko chain wallet provider:", error);
      return null;
    }
  }
};

// src/actions/transfer.ts
import {
  composeContext,
  elizaLogger,
  generateObjectDeprecated,
  ModelClass
} from "@elizaos/core";

// src/templates/index.ts
var transferTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested transfer:
- chain: Must be one of ["taiko", "taikoHekla"]. Default: "taiko"
- token: Token symbol (e.g., "ETH") or contract address (0x-prefixed). Default: "ETH"
- amount: Positive number as string in ether units (e.g., "0.1"). Required
- toAddress: Valid Ethereum address (0x-prefixed) or web3 domain name. Required
- data: (Optional) Transaction data as hex string (0x-prefixed)

Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
    "chain": "taiko" | "taikoHekla",
    "token": string,
    "amount": string,
    "toAddress": string,
    "data": string | null
}
\`\`\`
`;
var onchainAnalyticsTemplate = `Given the recent messages below:

{{recentMessages}}

Extract the following information about the smart contract to analyze:
- chain: Must be one of ["taiko", "taikoHekla"]. Default: "taiko"
- contractAddress: Valid Ethereum address (0x-prefixed). Required

Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
    "chain": "taiko" | "taikoHekla",
    "contractAddress": string 
}
\`\`\`
`;
var getBalanceTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested balance check:
- chain: Must be one of ["taiko", "taikoHekla"]. Default: "taiko"
- address: Valid Ethereum address (0x-prefixed) or web3 domain name. Default: Current wallet address
- token: Token symbol (e.g., "ETH") or contract address (0x-prefixed). Default: "ETH"

Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
    "chain": "taiko" | "taikoHekla",
    "address": string,
    "token": string
}
\`\`\`
`;

// src/services/transfer.ts
import {
  erc20Abi as erc20Abi2,
  formatEther,
  formatUnits as formatUnits2,
  parseEther,
  parseUnits
} from "viem";
var TransferAction = class {
  constructor(walletProvider) {
    this.walletProvider = walletProvider;
  }
  async transfer(params) {
    console.log("Initiating a transfer transaction in Taiko:", params);
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
    const nativeToken = this.walletProvider.chains[params.chain].nativeCurrency.symbol;
    const resp = {
      chain: params.chain,
      txHash: "0x",
      recipient: toAddress,
      amount: "",
      token: params.token === "null" ? null : params.token ?? nativeToken
    };
    try {
      if (!params.token || params.token === "null" || params.token === nativeToken) {
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
  async handleNativeTransfer(params, toAddress, resp) {
    if (!params.amount) {
      throw new Error("Amount is required for native token transfer");
    }
    const value = parseEther(params.amount);
    resp.amount = formatEther(value);
    resp.txHash = await this.walletProvider.transfer(
      params.chain,
      toAddress,
      value
    );
  }
  async handleERC20Transfer(params, fromAddress, toAddress, resp) {
    const tokenAddress = params.token.startsWith("0x") ? params.token : await this.walletProvider.getTokenAddress(
      params.chain,
      params.token
    );
    const publicClient = this.walletProvider.getPublicClient(params.chain);
    const decimals = await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi2,
      functionName: "decimals"
    });
    const value = await this.getERC20TransferAmount(
      publicClient,
      tokenAddress,
      fromAddress,
      params.amount,
      decimals
    );
    resp.amount = formatUnits2(value, decimals);
    resp.txHash = await this.walletProvider.transferERC20(
      params.chain,
      tokenAddress,
      toAddress,
      value
    );
  }
  async getERC20TransferAmount(publicClient, tokenAddress, fromAddress, amount, decimals) {
    if (!amount) {
      return await publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi2,
        functionName: "balanceOf",
        args: [fromAddress]
      });
    }
    return parseUnits(amount, decimals);
  }
};

// src/actions/transfer.ts
var transferAction = {
  name: "transfer",
  description: "Transfer Native tokens and ERC20 tokens between addresses on Taiko",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger.log("Starting transfer action...");
    if (!(message.content.source === "direct")) {
      callback?.({
        text: "I can't do that for you.",
        content: { error: "Transfer not allowed" }
      });
      return false;
    }
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    state.walletInfo = await taikoWalletProvider.get(
      runtime,
      message,
      currentState
    );
    const transferContext = composeContext({
      state: currentState,
      template: transferTemplate
    });
    const content = await generateObjectDeprecated({
      runtime,
      context: transferContext,
      modelClass: ModelClass.LARGE
    });
    const walletProvider = initWalletProvider(runtime);
    const action = new TransferAction(walletProvider);
    const paramOptions = {
      chain: content.chain,
      token: content.token,
      amount: content.amount,
      toAddress: content.toAddress,
      data: content.data
    };
    try {
      const transferResp = await action.transfer(paramOptions);
      const explorerUrl = walletProvider.getCurrentChain().blockExplorers.default.url;
      callback?.({
        text: `Successfully transferred ${transferResp.amount} ${transferResp.token} to ${transferResp.recipient}

Link to explorer: ${explorerUrl}/tx/${transferResp.txHash}`,
        content: { ...transferResp }
      });
      return true;
    } catch (error) {
      elizaLogger.error("Error during transfer:", error.message);
      callback?.({
        text: `Transfer failed: ${error.message}`,
        content: { error: error.message }
      });
      return false;
    }
  },
  template: transferTemplate,
  validate: async (runtime) => {
    const privateKey = runtime.getSetting("TAIKO_PRIVATE_KEY");
    return typeof privateKey === "string" && privateKey.startsWith("0x");
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Transfer 1 ETH to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you transfer 1 ETH to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e on ETH",
          action: "TRANSFER",
          content: {
            chain: "taiko",
            token: "ETH",
            amount: "1",
            toAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
          }
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Transfer 1 token of 0x1234 to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you transfer 1 token of 0x1234 to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e on TAIKO",
          action: "TRANSFER",
          content: {
            chain: "taiko",
            token: "0x1234",
            amount: "1",
            toAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
          }
        }
      }
    ]
  ],
  similes: ["TRANSFER", "SEND_TOKENS", "TOKEN_TRANSFER", "MOVE_TOKENS"]
};

// src/actions/balance.ts
import {
  composeContext as composeContext2,
  elizaLogger as elizaLogger2,
  generateObjectDeprecated as generateObjectDeprecated2,
  ModelClass as ModelClass2
} from "@elizaos/core";

// src/services/balance.ts
import { erc20Abi as erc20Abi3, formatEther as formatEther2, formatUnits as formatUnits3 } from "viem";
var BalanceAction = class {
  constructor(walletProvider) {
    this.walletProvider = walletProvider;
  }
  async balance(params) {
    try {
      if (!params.address) {
        throw new Error("No address provided.");
      }
      const { chain, token } = params;
      const targetAddress = await this.walletProvider.formatAddress(
        params.address
      );
      const nativeToken = this.walletProvider.chains[chain].nativeCurrency.symbol;
      this.walletProvider.switchChain(chain);
      const publicClient = this.walletProvider.getPublicClient(chain);
      const response = {
        chain,
        address: targetAddress,
        balance: await this.fetchBalance({
          publicClient,
          token,
          nativeToken,
          targetAddress,
          chain
        })
      };
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch balance: ${error.message}`);
    }
  }
  async fetchBalance({
    publicClient,
    token,
    nativeToken,
    targetAddress,
    chain
  }) {
    if (!token || token === "null" || token === nativeToken) {
      const nativeBalanceWei = await publicClient.getBalance({
        address: targetAddress
      });
      return {
        token: nativeToken,
        amount: formatEther2(nativeBalanceWei)
      };
    }
    const tokenAddress = token.startsWith("0x") ? token : await this.walletProvider.getTokenAddress(chain, token);
    const [balance, decimals] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi3,
        functionName: "balanceOf",
        args: [targetAddress]
      }),
      publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi3,
        functionName: "decimals"
      })
    ]);
    return {
      token,
      amount: formatUnits3(balance, decimals)
    };
  }
};

// src/actions/balance.ts
var balanceAction = {
  name: "balance",
  description: "retrieve balance of a token for a given address.",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger2.log("Starting transfer action...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    state.walletInfo = await taikoWalletProvider.get(
      runtime,
      message,
      currentState
    );
    const balanceContext = composeContext2({
      state: currentState,
      template: getBalanceTemplate
    });
    const content = await generateObjectDeprecated2({
      runtime,
      context: balanceContext,
      modelClass: ModelClass2.LARGE
    });
    const walletProvider = initWalletProvider(runtime);
    const action = new BalanceAction(walletProvider);
    const paramOptions = {
      chain: content.chain,
      token: content.token,
      address: content.address
    };
    try {
      const resp = await action.balance(paramOptions);
      callback?.({
        text: `${resp.address} has ${resp.balance.amount} ${resp.balance.token} in ${resp.chain === "taikoHekla" ? "Taiko Hekla" : "Taiko"}.`,
        content: { ...resp }
      });
      return true;
    } catch (error) {
      elizaLogger2.error("Error during fetching balance:", error.message);
      callback?.({
        text: `Fetching failed: ${error.message}`,
        content: { error: error.message }
      });
      return false;
    }
  },
  template: transferTemplate,
  validate: async (runtime) => {
    const privateKey = runtime.getSetting("TAIKO_PRIVATE_KEY");
    return typeof privateKey === "string" && privateKey.startsWith("0x");
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "How much USDC does siddesh.eth have in Taiko?"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll find how much USDC does siddesh.eth have in Taiko",
          action: "GET_BALANCE",
          content: {
            chain: "taiko",
            token: "USDC",
            address: "siddesh.eth"
          }
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Tell how many ETH does 0x742d35Cc6634C0532925a3b844Bc454e4438f44e have in Taiko Hekla."
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Sure, Let me find the balance of ETH for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e on Taiko Hekla",
          action: "GET_BALANCE",
          content: {
            chain: "taikoHekla",
            token: "ETH",
            address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
          }
        }
      }
    ]
  ],
  similes: ["GET_BALANCE", "BALANCE"]
};

// src/actions/onchainAnalytics.ts
import {
  composeContext as composeContext3,
  elizaLogger as elizaLogger3,
  generateObjectDeprecated as generateObjectDeprecated3,
  ModelClass as ModelClass3
} from "@elizaos/core";

// src/services/onchainAnalytics.ts
var OnchainAnalyticsAction = class {
  constructor(goldrushAPIKey) {
    this.goldrushAPIKey = goldrushAPIKey;
    if (!goldrushAPIKey) {
      throw new Error("Goldrush API key is required");
    }
  }
  async getOnchainAnalytics(params) {
    if (!params.contractAddress?.startsWith("0x")) {
      throw new Error("Contract address must start with '0x'");
    }
    const transactions = await this.fetchTaikoTransactions(params);
    if (!transactions) {
      throw new Error("Failed to fetch transaction data");
    }
    return this.analyzeTransactions(transactions);
  }
  async fetchTaikoTransactions(params) {
    const chainId = params.chainName === "taikoHekla" ? "taiko-hekla-testnet" : "taiko-mainnet";
    const GOLDRUSH_API = `https://api.covalenthq.com/v1/${chainId}/address/${params.contractAddress}/transactions_v2/?page-size=1000`;
    try {
      const response = await fetch(GOLDRUSH_API, {
        headers: {
          Authorization: `Bearer ${this.goldrushAPIKey}`
        }
      });
      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`
        );
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching Taiko transactions:", error);
      return null;
    }
  }
  analyzeTransactions(data) {
    if (!data?.data?.items?.length) {
      return this.getEmptyAnalysis();
    }
    const now = /* @__PURE__ */ new Date();
    const oneDayAgo = /* @__PURE__ */ new Date();
    oneDayAgo.setDate(now.getDate() - 1);
    const sevenDaysAgo = /* @__PURE__ */ new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const thirtyDaysAgo = /* @__PURE__ */ new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    let totalGasSpent1d = 0;
    let totalGasSpent7d = 0;
    let totalGasSpent30d = 0;
    let txCount1d = 0;
    let txCount7d = 0;
    let txCount30d = 0;
    const uniqueAddresses1d = /* @__PURE__ */ new Set();
    const uniqueAddresses7d = /* @__PURE__ */ new Set();
    const uniqueAddresses30d = /* @__PURE__ */ new Set();
    const addressInteractions1d = /* @__PURE__ */ new Map();
    const addressInteractions7d = /* @__PURE__ */ new Map();
    const addressInteractions30d = /* @__PURE__ */ new Map();
    for (const tx of data.data.items) {
      const txDate = new Date(tx.block_signed_at);
      if (txDate >= oneDayAgo) {
        totalGasSpent1d += tx.gas_spent;
        uniqueAddresses1d.add(tx.from_address);
        uniqueAddresses1d.add(tx.to_address);
        addressInteractions1d.set(
          tx.from_address,
          (addressInteractions1d.get(tx.from_address) || 0) + 1
        );
        addressInteractions1d.set(
          tx.to_address,
          (addressInteractions1d.get(tx.to_address) || 0) + 1
        );
        txCount1d++;
      }
      if (txDate >= sevenDaysAgo) {
        totalGasSpent7d += tx.gas_spent;
        uniqueAddresses7d.add(tx.from_address);
        uniqueAddresses7d.add(tx.to_address);
        addressInteractions7d.set(
          tx.from_address,
          (addressInteractions7d.get(tx.from_address) || 0) + 1
        );
        addressInteractions7d.set(
          tx.to_address,
          (addressInteractions7d.get(tx.to_address) || 0) + 1
        );
        txCount7d++;
      }
      if (txDate >= thirtyDaysAgo) {
        totalGasSpent30d += tx.gas_spent;
        uniqueAddresses30d.add(tx.from_address);
        uniqueAddresses30d.add(tx.to_address);
        addressInteractions30d.set(
          tx.from_address,
          (addressInteractions30d.get(tx.from_address) || 0) + 1
        );
        addressInteractions30d.set(
          tx.to_address,
          (addressInteractions30d.get(tx.to_address) || 0) + 1
        );
        txCount30d++;
      }
    }
    function getTopAddresses(addressInteractions, topN) {
      return Array.from(addressInteractions.entries()).sort((a, b) => b[1] - a[1]).slice(0, topN).map(([address]) => address);
    }
    const topAddresses1d = getTopAddresses(addressInteractions1d, 3);
    const topAddresses7d = getTopAddresses(addressInteractions7d, 3);
    const topAddresses30d = getTopAddresses(addressInteractions30d, 3);
    return {
      gasSpent: {
        "1d": `${totalGasSpent1d} gwei`,
        "7d": `${totalGasSpent7d} gwei`,
        "30d": `${totalGasSpent30d} gwei`
      },
      txCount: {
        "1d": txCount1d,
        "7d": txCount7d,
        "30d": txCount30d
      },
      uniqueAddresses: {
        "1d": Array.from(uniqueAddresses1d).length,
        "7d": Array.from(uniqueAddresses7d).length,
        "30d": Array.from(uniqueAddresses30d).length
      },
      topAddresses: {
        "1d": topAddresses1d,
        "7d": topAddresses7d,
        "30d": topAddresses30d
      }
    };
  }
  getEmptyAnalysis() {
    return {
      gasSpent: {
        "1d": "0 gwei",
        "7d": "0 gwei",
        "30d": "0 gwei"
      },
      txCount: {
        "1d": 0,
        "7d": 0,
        "30d": 0
      },
      uniqueAddresses: {
        "1d": 0,
        "7d": 0,
        "30d": 0
      },
      topAddresses: {
        "1d": [],
        "7d": [],
        "30d": []
      }
    };
  }
};

// src/environment.ts
import { z } from "zod";
var taikoEnvSchema = z.object({
  GOLDRUSH_API_KEY: z.string().min(1, "Goldrush API key is required"),
  TAIKO_PRIVATE_KEY: z.string().min(1, "TAIKO private key is required")
});
async function validateTaikoConfig(runtime) {
  try {
    const config = {
      GOLDRUSH_API_KEY: runtime.getSetting("GOLDRUSH_API_KEY"),
      TAIKO_PRIVATE_KEY: runtime.getSetting("TAIKO_PRIVATE_KEY")
    };
    return taikoEnvSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("\n");
      throw new Error(
        `Taiko configuration validation failed:
${errorMessages}`
      );
    }
    throw error;
  }
}

// src/utils/index.ts
function formatAnalysisResults(analysisResults) {
  const { gasSpent, txCount, uniqueAddresses, topAddresses } = analysisResults;
  const formatTopAddresses = (addresses) => {
    if (addresses.length === 0) return "None";
    return addresses.map((address, index) => `${index + 1}. ${address}`).join("\n");
  };
  return `
      **Contract Analytics:**
  
      **Gas Spent:**
        - Last 1 Day: ${gasSpent["1d"]}
        - Last 7 Days: ${gasSpent["7d"]}
        - Last 30 Days: ${gasSpent["30d"]}
  
      **Transaction Count:**
        - Last 1 Day: ${txCount["1d"]}
        - Last 7 Days: ${txCount["7d"]}
        - Last 30 Days: ${txCount["30d"]}
  
      **Unique Addresses:**
        - Last 1 Day: ${uniqueAddresses["1d"]}
        - Last 7 Days: ${uniqueAddresses["7d"]}
        - Last 30 Days: ${uniqueAddresses["30d"]}
  
       **Top Addresses by Interactions:**
      - 1 Day:
${formatTopAddresses(topAddresses["1d"])}
      - 7 Days:
${formatTopAddresses(topAddresses["7d"])}
      - 30 Days:
${formatTopAddresses(topAddresses["30d"])}
    `;
}

// src/actions/onchainAnalytics.ts
var onchainAnalyticsAction = {
  name: "onchainAnalytics",
  description: "Gives an overview of a given address in terms onchain activity.",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger3.log("Starting a onchain analytics research action");
    const context = composeContext3({
      state,
      template: onchainAnalyticsTemplate
    });
    const content = await generateObjectDeprecated3({
      runtime,
      context,
      modelClass: ModelClass3.LARGE
    });
    const config = await validateTaikoConfig(runtime);
    const action = new OnchainAnalyticsAction(config.GOLDRUSH_API_KEY);
    const paramOptions = {
      chainName: content.chain,
      contractAddress: content.contractAddress
    };
    try {
      const resp = await action.getOnchainAnalytics(paramOptions);
      callback?.({
        text: `Here you go,
 ${formatAnalysisResults(resp)}`,
        content: { ...resp }
      });
      return true;
    } catch (error) {
      elizaLogger3.error(
        "Error during fetching analytics:",
        error.message
      );
      callback?.({
        text: `Analytics Process failed: ${error.message}`,
        content: { error: error.message }
      });
      return false;
    }
  },
  template: onchainAnalyticsTemplate,
  validate: async (runtime) => {
    return true;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show some contract metrics for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll find out and show the contract metrics for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          action: "ONCHAIN_ANALYTICS",
          content: {
            chain: "taiko",
            contractAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
          }
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Tell me about this contract 0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll find the metrics for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e on Taiko",
          action: "ONCHAIN_ANALYTICS",
          content: {
            chain: "taiko",
            contractAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
          }
        }
      }
    ]
  ],
  similes: [
    "ONCHAIN_ANALYTICS",
    "GET_CONTRACT_ANALYTICS",
    "GAS_SPENT",
    "TOTAL_TRANSACTIONS"
  ]
};

// src/index.ts
var taikoPlugin = {
  name: "taiko",
  description: "Taiko plugin for Eliza",
  actions: [transferAction, onchainAnalyticsAction, balanceAction],
  evaluators: [],
  providers: [taikoWalletProvider]
};
var index_default = taikoPlugin;
export {
  index_default as default,
  taikoPlugin
};
//# sourceMappingURL=index.js.map