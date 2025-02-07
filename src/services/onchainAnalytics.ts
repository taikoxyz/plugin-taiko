import type {
    ContractTransactionsParams,
    ContractTransactionsResponse,
    TransactionAnalysis,
} from "../types";

export class OnchainAnalyticsAction {
    constructor(private goldrushAPIKey: string) {
        if (!goldrushAPIKey) {
            throw new Error("Goldrush API key is required");
        }
    }
    async getOnchainAnalytics(params: ContractTransactionsParams) {
        if (!params.contractAddress?.startsWith("0x")) {
            throw new Error("Contract address must start with '0x'");
        }

        const transactions = await this.fetchTaikoTransactions(params);

        if (!transactions) {
            throw new Error("Failed to fetch transaction data");
        }

        return this.analyzeTransactions(transactions);
    }

    async fetchTaikoTransactions(
        params: ContractTransactionsParams
    ): Promise<ContractTransactionsResponse | null> {
        const chainId =
            params.chainName === "taikoHekla"
                ? "taiko-hekla-testnet"
                : "taiko-mainnet";

        const GOLDRUSH_API = `https://api.covalenthq.com/v1/${chainId}/address/${params.contractAddress}/transactions_v2/?page-size=1000`;

        try {
            const response = await fetch(GOLDRUSH_API, {
                headers: {
                    Authorization: `Bearer ${this.goldrushAPIKey}`,
                },
            });

            if (!response.ok) {
                throw new Error(
                    `API request failed: ${response.status} ${response.statusText}`
                );
            }

            const data = await response.json();
            return data as ContractTransactionsResponse;
        } catch (error) {
            console.error("Error fetching Taiko transactions:", error);
            return null;
        }
    }

    analyzeTransactions(
        data: ContractTransactionsResponse
    ): TransactionAnalysis {
        if (!data?.data?.items?.length) {
            return this.getEmptyAnalysis();
        }

        const now = new Date();
        const oneDayAgo = new Date();
        oneDayAgo.setDate(now.getDate() - 1);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        let totalGasSpent1d = 0;
        let totalGasSpent7d = 0;
        let totalGasSpent30d = 0;

        let txCount1d = 0;
        let txCount7d = 0;
        let txCount30d = 0;

        const uniqueAddresses1d = new Set<string>();
        const uniqueAddresses7d = new Set<string>();
        const uniqueAddresses30d = new Set<string>();

        const addressInteractions1d = new Map<string, number>();
        const addressInteractions7d = new Map<string, number>();
        const addressInteractions30d = new Map<string, number>();

        for (const tx of data.data.items) {
            const txDate = new Date(tx.block_signed_at);

            // Track 1 day data
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

            // Track 7 days data
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

            // Track 30 days data
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

        // Function to get top addresses by interaction count
        function getTopAddresses(
            addressInteractions: Map<string, number>,
            topN: number
        ): string[] {
            return Array.from(addressInteractions.entries())
                .sort((a, b) => b[1] - a[1]) // Sort by interaction count (descending)
                .slice(0, topN)
                .map(([address]) => address);
        }

        const topAddresses1d = getTopAddresses(addressInteractions1d, 3); // Top 3 addresses for 1 day
        const topAddresses7d = getTopAddresses(addressInteractions7d, 3); // Top 3 addresses for 7 days
        const topAddresses30d = getTopAddresses(addressInteractions30d, 3); // Top 3 addresses for 30 days

        return {
            gasSpent: {
                "1d": `${totalGasSpent1d} gwei`,
                "7d": `${totalGasSpent7d} gwei`,
                "30d": `${totalGasSpent30d} gwei`,
            },
            txCount: {
                "1d": txCount1d,
                "7d": txCount7d,
                "30d": txCount30d,
            },
            uniqueAddresses: {
                "1d": Array.from(uniqueAddresses1d).length,
                "7d": Array.from(uniqueAddresses7d).length,
                "30d": Array.from(uniqueAddresses30d).length,
            },
            topAddresses: {
                "1d": topAddresses1d,
                "7d": topAddresses7d,
                "30d": topAddresses30d,
            },
        };
    }

    private getEmptyAnalysis(): TransactionAnalysis {
        return {
            gasSpent: {
                "1d": "0 gwei",
                "7d": "0 gwei",
                "30d": "0 gwei",
            },
            txCount: {
                "1d": 0,
                "7d": 0,
                "30d": 0,
            },
            uniqueAddresses: {
                "1d": 0,
                "7d": 0,
                "30d": 0,
            },
            topAddresses: {
                "1d": [],
                "7d": [],
                "30d": [],
            },
        };
    }
}
