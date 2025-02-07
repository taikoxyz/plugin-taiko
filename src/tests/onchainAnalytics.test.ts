import { describe, it, expect, beforeEach, vi } from "vitest";
import { OnchainAnalyticsAction } from "../services/onchainAnalytics";

describe("OnchainAnalyticsAction", () => {
    let oa: OnchainAnalyticsAction;
    const GOLDRUSH_API_KEY = "goldrush-key";
    const VALID_CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890";

    beforeEach(() => {
        vi.resetAllMocks();
        oa = new OnchainAnalyticsAction(GOLDRUSH_API_KEY);
        global.fetch = vi.fn();
    });

    describe("getOnchainAnalytics", () => {
        it("throws error if contract address doesn't start with 0x", async () => {
            await expect(
                oa.getOnchainAnalytics({
                    chainName: "taikoHekla",
                    contractAddress: "invalid-address",
                })
            ).rejects.toThrow("Contract address must start with '0x'");
        });

        it("throws error if transaction fetch fails", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: "Not Found",
            });

            await expect(
                oa.getOnchainAnalytics({
                    chainName: "taikoHekla",
                    contractAddress: VALID_CONTRACT_ADDRESS,
                })
            ).rejects.toThrow("Failed to fetch transaction data");
        });

        it("returns empty analysis when no transactions found", async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ data: { items: [] } }),
            });

            const result = await oa.getOnchainAnalytics({
                chainName: "taikoHekla",
                contractAddress: VALID_CONTRACT_ADDRESS,
            });

            expect(result).toEqual({
                gasSpent: { "1d": "0 gwei", "7d": "0 gwei", "30d": "0 gwei" },
                txCount: { "1d": 0, "7d": 0, "30d": 0 },
                uniqueAddresses: { "1d": 0, "7d": 0, "30d": 0 },
                topAddresses: { "1d": [], "7d": [], "30d": [] },
            });
        });

        it("correctly analyzes transaction data", async () => {
            const mockDate = new Date("2025-01-15T12:00:00Z");
            vi.setSystemTime(mockDate);

            const mockTransactions = {
                data: {
                    items: [
                        {
                            block_signed_at: "2025-01-15T10:00:00Z", // Within 1 day
                            gas_spent: 1000,
                            from_address: "0xaddr1",
                            to_address: "0xaddr2",
                        },
                        {
                            block_signed_at: "2025-01-10T10:00:00Z", // Within 7 days
                            gas_spent: 2000,
                            from_address: "0xaddr3",
                            to_address: "0xaddr4",
                        },
                        {
                            block_signed_at: "2025-01-01T10:00:00Z", // Within 30 days
                            gas_spent: 3000,
                            from_address: "0xaddr5",
                            to_address: "0xaddr6",
                        },
                    ],
                },
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockTransactions),
            });

            const result = await oa.getOnchainAnalytics({
                chainName: "taikoHekla",
                contractAddress: VALID_CONTRACT_ADDRESS,
            });

            expect(result.gasSpent["1d"]).toBe("1000 gwei");
            expect(result.gasSpent["7d"]).toBe("3000 gwei");
            expect(result.gasSpent["30d"]).toBe("6000 gwei");

            expect(result.txCount["1d"]).toBe(1);
            expect(result.txCount["7d"]).toBe(2);
            expect(result.txCount["30d"]).toBe(3);

            expect(result.uniqueAddresses["1d"]).toBe(2);
            expect(result.uniqueAddresses["7d"]).toBe(4);
            expect(result.uniqueAddresses["30d"]).toBe(6);

            vi.useRealTimers();
        });
    });
});
