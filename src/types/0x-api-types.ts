// Websocket return types
// Very similar to 0x-subgraph-types but Signature is part of Order type and not
// part of Record type
export type WebSocketMessage = PoolData[];

type Order = { // @todo rename to 0xAPIOrder maybe? and for subgraph we call it 0xGraphOrder?
    signature: Signature;
    sender: string;
    maker: string;
    taker: string;
    takerTokenFeeAmount: string;
    makerAmount: string;
    takerAmount: string;
    makerToken: string;
    takerToken: string;
    salt: string;
    verifyingContract: string;
    feeRecipient: string;
    expiry: string;
    chainId: number;
    pool: string;
}

type Signature = {
    r: string;
    s: string;
    signatureType: number;
    v: number;
}

type MetaData = {
    createdAt: string;
    orderHash: string;
    remainingFillableTakerAmount: string;
  }

export type Record = {
    order: Order;
    metaData: MetaData;
};

type BidAsk = {
    total: number;
    page: number;
    perPage: number;
    records: Record[];
};

export type PoolData = {
    poolId: string;
    first: {
        bids: BidAsk;
        asks: BidAsk;
    };
    second: {
        bids: BidAsk;
        asks: BidAsk;
    };
};