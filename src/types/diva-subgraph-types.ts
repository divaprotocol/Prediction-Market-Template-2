export type Pool = {
    id: string;
    floor: string;
    inflection: string;
    cap: string;
    gradient: string;
    collateralBalance: string;
    collateralBalanceGross: string;
    finalReferenceValue: string;
    capacity: string;
    statusTimestamp: string;
    shortToken: PositionToken;
    payoutShort: string;
    longToken: PositionToken;
    payoutLong: string;
    collateralToken: CollateralToken;
    expiryTime: string;
    dataProvider: string;
    protocolFee: string;
    settlementFee: string;
    submissionPeriod: string;
    challengePeriod: string;
    reviewPeriod: string;
    fallbackSubmissionPeriod: string;
    statusFinalReferenceValue: string;
    referenceAsset: string;
    supplyShort: string;
    supplyLong: string;
    permissionedERC721Token: string;
    createdBy: string;
    createdAt: string;
    challenges: Challenge[];
}

type Challenge = {
    id: string;
    challengedBy: string;
    proposedFinalReferenceValue: string;
    pool: Pool;
}

type PositionToken = {
    id: string;
    name: string;
    symbol: string;
    decimals: number;
    pool: Pool;
    owner: string;
    users: UserPositionToken[];
}

type CollateralToken = {
    id: string;
    name: string;
    symbol: string;
    decimals: number;
    feeRecipients: FeeRecipientCollateralToken[];
}

type UserPositionToken = {
    id: string;
    user: User;
    positionToken: PositionToken;
    receivedAt: string;
}

type User = {
    id: string;
    positionTokens: UserPositionToken[];
}

type FeeRecipientCollateralToken = {
    id: string;
    feeRecipient: FeeRecipient;
    collateralToken: CollateralToken;
    amount: string;
}

type FeeRecipient = {
    id: string;
    collateralTokens: FeeRecipientCollateralToken[];
}
