import { describe, it, beforeEach, expect } from "vitest";
import {
    generatePrivateKey,
    Account,
    privateKeyToAccount,
} from "viem/accounts";

import { WalletProvider } from "../providers/wallet";
import { GetBalanceParams } from "../types";
import { BalanceAction } from "../services/balance";

describe("GetBalance Action", () => {
    let account: Account;
    let wp: WalletProvider;
    let ga: BalanceAction;

    beforeEach(async () => {
        const pk = generatePrivateKey();
        account = privateKeyToAccount(pk);
        wp = new WalletProvider(pk);
        ga = new BalanceAction(wp);
    });

    describe("Get Balance", () => {
        it("get ETH balance", async () => {
            const input: GetBalanceParams = {
                chain: "taiko",
                address: account.address,
                token: "ETH",
            };
            const resp = await ga.balance(input);
            expect(resp.balance).toBeDefined();
            expect(typeof resp.balance).toBe("object");
        });

        it("get TAIKO balance", async () => {
            const input: GetBalanceParams = {
                chain: "taiko",
                address: account.address,
                token: "TAIKO",
            };
            const resp = await ga.balance(input);
            expect(resp.balance).toBeDefined();
            expect(typeof resp.balance).toBe("object");
        });

        it("get balance by token contract address", async () => {
            const input: GetBalanceParams = {
                chain: "taiko",
                address: account.address,
                token: "0xA9d23408b9bA935c230493c40C73824Df71A0975",
            };
            const resp = await ga.balance(input);
            expect(resp.balance).toBeDefined();
            expect(typeof resp.balance).toBe("object");
        });
    });
});
