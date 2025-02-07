# `@elizaos/plugin-taiko`

## Description

The Taiko Plugin provides integration with the Taiko Layer 2 network and Taiko Hekla Testnet, offering essential tools for onchain interactions.

## Features

-   Send native tokens and ERC20 tokens
-   Onchain name resolution
-   Monitor wallet balances in real-time
-   Track on-chain analytics for any address
-   Configure custom RPC endpoints

## Installation

```bash
pnpm install @elizaos/plugin-taiko
```

## Configuration

### Required Environment Variables

```env
# Required
TAIKO_PRIVATE_KEY= # Your Private Key
GOLDRUSH_API_KEY= # Request an API key from https://goldrush.dev/platform/

# Optional - Custom RPC URLs
TAIKO_PROVIDER_URL=https://your-custom-mainnet-rpc-url
```

### Chains Supported

By default, both **Taiko Alethia Mainnet** and **Taiko Hekla Testnet** are enabled.

## Actions

### 1. Transfer

Transfer native tokens and ERC20 tokens on Taiko L2:

> **Note:** This action supports domain name resolution for most name systems, including ENS and Unstoppable Domains. Check out the [Web3 Name SDK](https://goldrush.dev/platform/) for more information about name resolution.

```typescript
Transfer 1 ETH to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
```

```typescript
Send 1 TAIKO to vitalik.eth on Taiko Hekla
```

### 2. Balance Retrieval

Fetch balances of ETH and ERC20 tokens:

> **Note:** This action supports domain name resolution for most name systems, including ENS and Unstoppable Domains. Check out the [Web3 Name SDK](https://goldrush.dev/platform/) for more information about name resolution.

```typescript
Can you tell me how much USDC does vitalik.eth have on Taiko?
```

```typescript
How much ETH does 0x123abc have on Taiko Hekla?
```

### 3. Onchain Analytics

Track detailed on-chain metrics for any address on Taiko L2, including:

-   Total gas spent
-   Transaction count
-   Top interacted addresses
-   Unique address interactions

Available time frames: 1 day, 7 days, and 30

> **Tip:** This action is useful to understand the performance of a given smart contract on Taiko

```typescript
Show me the onchain analytics for 0x1231223 on Taiko Hekla.
```

## Development

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Build the plugin:

```bash
pnpm run build
```

4. Run tests:

```bash
pnpm test
```

## License

This plugin is part of the Eliza project. See the main project repository for license information.
