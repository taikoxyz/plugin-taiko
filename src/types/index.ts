import type { Address, Hash } from "viem";

export type SupportedChain = "taiko" | "taikoHekla";

// Action parameters
export interface GetBalanceParams {
    chain: SupportedChain;
    address?: Address;
    token: string;
}

export interface TransferParams {
    chain: SupportedChain;
    token?: string;
    amount?: string;
    toAddress: Address;
    data?: `0x${string}`;
}

// Action return types
export interface GetBalanceResponse {
    chain: SupportedChain;
    address: Address;
    balance?: { token: string; amount: string };
}

export interface TransferResponse {
    chain: SupportedChain;
    txHash: Hash;
    recipient: Address;
    amount: string;
    token: string;
    data?: `0x${string}`;
}

// Contract Analytics types
interface GasMetadata {
    contract_decimals: number;
    contract_name: string;
    contract_ticker_symbol: string;
    contract_address: string;
    supports_erc: string[];
    logo_url: string;
}

interface LogEvent {
    block_signed_at: string;
    block_height: number;
    tx_offset: number;
    log_offset: number;
    tx_hash: string;
    raw_log_topics: string[];
    sender_contract_decimals: number | null;
    sender_name: string | null;
    sender_contract_ticker_symbol: string | null;
    sender_address: string;
    sender_address_label: string | null;
    sender_logo_url: string | null;
    supports_erc: string[] | null;
    sender_factory_address: string | null;
    raw_log_data: string;
    decoded: {
        name: string;
        signature: string;
        params: {
            name: string;
            type: string;
            indexed: boolean;
            decoded: boolean;
            value: string;
        }[];
    } | null;
}

interface TransactionItem {
    block_signed_at: string;
    block_height: number;
    block_hash: string;
    tx_hash: string;
    tx_offset: number;
    successful: boolean;
    miner_address: string;
    from_address: string;
    from_address_label: string | null;
    to_address: string;
    to_address_label: string | null;
    value: string;
    value_quote: number;
    pretty_value_quote: string;
    gas_metadata: GasMetadata;
    gas_offered: number;
    gas_spent: number;
    gas_price: number;
    fees_paid: string;
    gas_quote: number;
    pretty_gas_quote: string;
    gas_quote_rate: number;
    log_events: LogEvent[];
}
export interface ContractTransactionsParams {
    contractAddress: string;
    chainName: "taiko" | "taikoHekla";
}
export interface ContractTransactionsResponse {
    data: {
        address: string;
        updated_at: string;
        next_update_at: string;
        quote_currency: string;
        chain_id: number;
        chain_name: string;
        items: TransactionItem[];
        pagination: {
            has_more: boolean;
            page_number: number;
            page_size: number;
            total_count: number | null;
        };
    };
    error: boolean;
    error_message: string | null;
    error_code: number | null;
}

export interface TransactionAnalysis {
    gasSpent: {
        "1d": string;
        "7d": string;
        "30d": string;
    };
    txCount: {
        "1d": number;
        "7d": number;
        "30d": number;
    };
    uniqueAddresses: {
        "1d": number;
        "7d": number;
        "30d": number;
    };
    topAddresses: {
        "1d": string[];
        "7d": string[];
        "30d": string[];
    };
}
