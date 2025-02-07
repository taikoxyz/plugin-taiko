import { describe, it, expect, beforeEach } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Account } from "viem";

import { TransferAction } from "../services/transfer";
import { WalletProvider } from "../providers/wallet";

describe("Transfer Action", () => {
    let account: Account;
    let wp: WalletProvider;
    let tp: TransferAction;

    beforeEach(async () => {
        const pk = generatePrivateKey();
        account = privateKeyToAccount(pk);
        wp = new WalletProvider(pk);
        tp = new TransferAction(wp);
    });

    describe("Constructor", () => {
        it("should initialize with wallet provider", () => {
            const ta = new TransferAction(wp);

            expect(ta).toBeDefined();
        });
    });
    describe("Transfer", () => {
        let ta: TransferAction;
        let receiver: Account;

        beforeEach(() => {
            ta = new TransferAction(wp);
            receiver = privateKeyToAccount(generatePrivateKey());
        });

        it("throws if not enough gas", async () => {
            await expect(
                ta.transfer({
                    chain: "taiko",
                    toAddress: receiver.address,
                    amount: "1",
                })
            ).rejects.toThrow(
                "Transfer failed: The total cost (gas * gas fee + value) of executing this transaction exceeds the balance of the account."
            );
        });
    });
});
