export const transferTemplate = `Given the recent messages and wallet information below:

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

export const onchainAnalyticsTemplate = `Given the recent messages below:

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

export const getBalanceTemplate = `Given the recent messages and wallet information below:

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
