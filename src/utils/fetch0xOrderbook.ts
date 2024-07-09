import { get0xOpenOrders, mapOrderData, createTable } from '../lib/0xOrders';
import { ORDER_TYPE } from './fetchPool';
import { Pool } from '@/types/diva-subgraph-types';
// Function to fetch 0x orderbook. This function handles both bids and asks,
// differentiating them based on the maker and taker tokens.

// @todo add typing
export const fetch0xOrderbook = async (
    pool: Pool,
    tokenAddress: string,
    chainId: number
) => {
    const orders = []

    // Query sell limit orders from 0x API (ask)
    const rSell = await get0xOpenOrders(
        tokenAddress ?? '', // makerToken
        pool.collateralToken.id, // takerToken
        chainId
    )

    // Query buy limit orders from 0x API (bid)
    const rBuy = await get0xOpenOrders(
        pool.collateralToken.id, // makerToken
        tokenAddress ?? '', // takerToken
        chainId
    )

    // @todo do we need mapOrderData? I don't think so as completeOrderBook was for displaying the orderbook in the DIVA App
    const orderBookBuy = mapOrderData(
        rBuy,
        pool.collateralToken.decimals,
        ORDER_TYPE.BUY
    )
    orders.push(orderBookBuy)

    const orderBookSell = mapOrderData(
        rSell,
        pool.collateralToken.decimals,
        ORDER_TYPE.SELL
    )
    orders.push(orderBookSell)

    // @todo needed?
    const completeOrderBook = createTable(
        orders[ORDER_TYPE.BUY],
        orders[ORDER_TYPE.SELL]
    )

    return {
        rBuy, // First element in array is best bid
        rSell, // First element is best ask
        completeOrderBook, // @todo needed?; length of array is min of rBuy and rSell arrays -> adapted for DIVA Protocol
    }

    // Example output (rBuy and rSell are of same structure, just with taker and maker token swapped)

    // longTokenInfo {
    //     rBuy: [ { order: {}, metaData: {} } ],
    //     rSell: [
    //       { order: {}, metaData: {} },
    //       { order: {}, metaData: {} }
    //     ],
    //     completeOrderBook: [
    //         {},
    //         {},
    //         ...
    //     ]
    // }

    // longTokenInfo.rBuy [
    //     {
    //       order: {
    //         signature: [Object],
    //         sender: '0x0000000000000000000000000000000000000000',
    //         maker: '0x9adefeb576dcf52f5220709c1b267d89d5208d78',
    //         taker: '0x0000000000000000000000000000000000000000',
    //         takerTokenFeeAmount: '30000000000000000000',
    //         makerAmount: '2340000000000000000000',
    //         takerAmount: '3000000000000000000000',
    //         makerToken: '0x40cad342a67bf49a2c384203025ad1ebee1e30c5',
    //         takerToken: '0x712c359b44a32ca2d61c337414b90db81c9738ca',
    //         salt: '1712956870801',
    //         verifyingContract: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
    //         feeRecipient: '0x1062ccc9f9a4bbcf565799683b6c00ea525ecb9f',
    //         expiry: '1744492870',
    //         chainId: 137,
    //         pool: '0x0000000000000000000000000000000000000000000000000000000000000000'
    //       },
    //       metaData: {
    //         orderHash: '0x0109296f97345be92a137803810ecd6eb08c82035b77c43a241af2adbf09f9ae',
    //         remainingFillableTakerAmount: '2982068269230769231031',
    //         createdAt: '2024-04-12T21:21:12.867Z'
    //       }
    //     }
    //   ]

    // longTokenInfo.rSell [
    //     {
    //       order: {
    //         signature: [Object],
    //         sender: '0x0000000000000000000000000000000000000000',
    //         maker: '0x9adefeb576dcf52f5220709c1b267d89d5208d78',
    //         taker: '0x0000000000000000000000000000000000000000',
    //         takerTokenFeeAmount: '7900000000000000',
    //         makerAmount: '1000000000000000000',
    //         takerAmount: '790000000000000000',
    //         makerToken: '0x712c359b44a32ca2d61c337414b90db81c9738ca',
    //         takerToken: '0x40cad342a67bf49a2c384203025ad1ebee1e30c5',
    //         salt: '1714245872799',
    //         verifyingContract: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
    //         feeRecipient: '0x1062ccc9f9a4bbcf565799683b6c00ea525ecb9f',
    //         expiry: '1714246472',
    //         chainId: 137,
    //         pool: '0x0000000000000000000000000000000000000000000000000000000000000000'
    //       },
    //       metaData: {
    //         orderHash: '0x467ef2a102a89ac8922fca5b7bf8aaa304255006133116ae557c1eb55f7805e1',
    //         remainingFillableTakerAmount: '790000000000000000',
    //         createdAt: '2024-04-27T19:24:34.143Z'
    //       }
    //     },
    //     {
    //       order: {
    //         signature: [Object],
    //         sender: '0x0000000000000000000000000000000000000000',
    //         maker: '0x9adefeb576dcf52f5220709c1b267d89d5208d78',
    //         taker: '0x0000000000000000000000000000000000000000',
    //         takerTokenFeeAmount: '8000000000000000000',
    //         makerAmount: '1000000000000000000000',
    //         takerAmount: '800000000000000000000',
    //         makerToken: '0x712c359b44a32ca2d61c337414b90db81c9738ca',
    //         takerToken: '0x40cad342a67bf49a2c384203025ad1ebee1e30c5',
    //         salt: '1712956297092',
    //         verifyingContract: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
    //         feeRecipient: '0x1062ccc9f9a4bbcf565799683b6c00ea525ecb9f',
    //         expiry: '1744492297',
    //         chainId: 137,
    //         pool: '0x0000000000000000000000000000000000000000000000000000000000000000'
    //       },
    //       metaData: {
    //         orderHash: '0x4561d424c848c4e448bf3c74da91c4dbb0472fb257681c3a67977964041dce2e',
    //         remainingFillableTakerAmount: '782629000000000000120',
    //         createdAt: '2024-04-12T21:11:39.002Z'
    //       }
    //     }
    //   ]

    // completeOrderBook: [
    //     {
    //         buyExpiry: '504116 mins',
    //         buyQuantity: '2982.068269230769231031',
    //         bid: '0.78',
    //         sellExpiry: '9 mins',
    //         sellQuantity: '1.0',
    //         ask: '0.79'
    //     },
    //     {
    //         buyExpiry: '-',
    //         buyQuantity: '',
    //         bid: '',
    //         sellExpiry: '504106 mins',
    //         sellQuantity: '978.28625000000000015',
    //         ask: '0.8'
    //     }
    // ]
}