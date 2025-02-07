import { describe, it, expect, beforeAll } from "vitest";
import {
    Account,
    generatePrivateKey,
    privateKeyToAccount,
} from "viem/accounts";
import { taiko, taikoHekla } from "viem/chains";

import { WalletProvider } from "../providers/wallet";

describe("Wallet provider", () => {
    let pk: `0x${string}`;
    let account: Account;
    let walletProvider: WalletProvider;

    beforeAll(() => {
        pk = generatePrivateKey();
        account = privateKeyToAccount(pk);
        walletProvider = new WalletProvider(pk);
    });

    describe("Constructor", () => {
        it("get address", () => {
            const expectedAddress = account.address;

            expect(walletProvider.getAddress()).toEqual(expectedAddress);
        });
        it("get current chain", () => {
            expect(walletProvider.getCurrentChain().id).toEqual(taiko.id);
        });
        it("get chain configs", () => {
            expect(walletProvider.getChainConfigs("taiko").id).toEqual(
                taiko.id
            );
            expect(walletProvider.getChainConfigs("taikoHekla").id).toEqual(
                taikoHekla.id
            );
        });
    });
    describe("Clients", () => {
        it("generates public client", () => {
            const client = walletProvider.getPublicClient("taiko");
            expect(client.chain.id).toEqual(taiko.id);
            expect(client.transport.url).toEqual(taiko.rpcUrls.default.http[0]);
        });

        it("generates wallet client", () => {
            const expectedAddress = account.address;

            const client = walletProvider.getWalletClient("taiko");

            expect(client.account?.address).toEqual(expectedAddress);
            expect(client.transport.url).toEqual(taiko.rpcUrls.default.http[0]);
        });
    });
});
