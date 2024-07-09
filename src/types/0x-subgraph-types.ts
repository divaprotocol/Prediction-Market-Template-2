export type OrderRecord = {
  metaData: OrderMetaData;
  order: Order;
  signature: OrderSignature;
}

type OrderMetaData = {
  createdAt: string;
  orderHash: string;
  remainingFillableTakerAmount: string;
}
  
type OrderSignature = {
  r: string;
  s: string;
  signatureType: number;
  v: number;
}

export type Order = {
  chainId: number;
  expiry: string;
  feeRecipient: string;
  maker: string;
  makerAmount: string;
  makerToken: string;
  pool: string;
  salt: string;
  sender: string;
  taker: string;
  takerAmount: string;
  takerToken: string;
  takerTokenFeeAmount: string;
  verifyingContract: string;
}

export type OrderFill = {
	id: string
	orderHash: string
	maker: string
	taker: string
	makerToken: string
	takerToken: string
	makerTokenFilledAmount: string
	takerTokenFilledAmount: string
	takerTokenFeeFilledAmount: string
	timestamp: number
}



