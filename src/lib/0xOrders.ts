import { AppConfig } from '@/config'
import axios from 'axios'
import { BigNumber, ethers } from 'ethers'
import { formatUnits, parseUnits } from 'ethers/lib/utils'
import { OrderRecord } from '../types/0x-subgraph-types';
import { getExpiryMinutesFromNow } from '@/utils'
import { Record } from '@/types/0x-api-types'

/**
 * @title Fetches open orders from the 0x API
 * @dev Retrieves the open orders from the 0x API for a specified trading pair.
 *      This function handles both bids and asks, differentiating them based on
 *      the maker and taker tokens. It supports pagination and will fetch up to
 *      a maximum defined number of pages.
 * 
 * @param {string} makerToken The address of the maker token, used as the quote token for bids and base token for asks.
 * @param {string} takerToken The address of the taker token, used as the base token for bids and quote token for asks.
 * @param {number} chainId The blockchain network ID for which the orders are fetched.
 * @return {Promise<any[]>} A promise that resolves with an array of open orders if successful, or an empty array if an error occurs.
 *
 * @note The function fetches a maximum of 1000 orders per page and handles up to 2 pages by default.
 *       It's configured to adjust for more pages based on the `perPage` and `MAX_PAGES` settings.
 *       Modify `MAX_PAGES` to fetch more or fewer pages.
 */
export const get0xOpenOrders = async (
    makerToken: string,
    takerToken: string,
    chainId: number
): Promise<OrderRecord[]> => {
    // API query settings
    const perPage = 1000;
    const MAX_PAGES = 2; // Limiting the maximum number of pages to fetch
    const baseURL = AppConfig?.order + '/pair';

    // Helper function to fetch orders for a given page
    const fetchOrders = async (page: number): Promise<{ records: OrderRecord[]; total: number }> => {
        const url = `${baseURL}?quoteToken=${makerToken}&baseToken=${takerToken}&page=${page}&perPage=${perPage}`;
        try {
            const response = await axios.get(url);
            return {
                records: response.data.bids.records as OrderRecord[],
                total: response.data.bids.total as number
            }
        } catch (error) {
            console.error('Failed to fetch 0x orders:', error);
            throw error;
        }
    };

    try {
        // Fetch the first page of orders
        const firstPage = await fetchOrders(1);
        let allOrders = firstPage.records;
        const totalOrders = firstPage.total;

        // Calculate the total number of pages based on the total number of orders
        if (totalOrders > perPage) {
            const totalPages = Math.ceil(totalOrders / perPage);
            const pagesToFetch = Math.min(totalPages, MAX_PAGES);

            // Fetch additional pages if necessary
            for (let page = 2; page <= pagesToFetch; page++) {
                const additionalPage = await fetchOrders(page);
                allOrders = allOrders.concat(additionalPage.records);
            }
        }
        return allOrders;
    } catch (err) {
        console.error('Failed to fetch 0x orders:', err);
        throw err;
    }
};


export const mapOrderData = (
    records: any[],
    decimals: number,
    orderType: number // 0 = BUY, 1 = SELL
) => {
    // Get orderbook (comes already filtered and cleaned up)
    const orderbook: any = records.map((record: any) => {
        const order = record.order
        const metaData = record.metaData
        const orders: any = {}

        // Buy Limit (orderType = 0)
        if (orderType === 0) {
            orders.expiry = getExpiryMinutesFromNow(order.expiry)
            orders.orderType = 'buy'
            orders.id = 'buy' + records.indexOf(record as never)

            // Calculate Bid amount
            const bidAmount = BigNumber.from(order.makerAmount)
                .mul(parseUnits('1', decimals))
                .div(BigNumber.from(order.takerAmount)) // result is in collateral token decimals

            // Value to display in the orderbook
            orders.bid = formatUnits(bidAmount, decimals)

            // Display remainingFillableTakerAmount as the quantity in the orderbook
            orders.nbrOptions = formatUnits(
                BigNumber.from(metaData.remainingFillableTakerAmount),
                decimals
            )
        }

        // Sell Limit (orderType = 1)
        if (orderType === 1) {
            orders.expiry = getExpiryMinutesFromNow(order.expiry)
            orders.orderType = 'sell'
            orders.id = 'sell' + records.indexOf(record as never)

            // Calculate Ask amount
            const askAmount = BigNumber.from(order.takerAmount)
                .mul(parseUnits('1', decimals))
                .div(BigNumber.from(order.makerAmount)) // result is in collateral token decimals

            // Value to display in the orderbook
            orders.ask = formatUnits(askAmount, decimals)

            if (
                BigNumber.from(metaData.remainingFillableTakerAmount).lt(
                    BigNumber.from(order.takerAmount)
                )
            ) {
                const remainingFillableMakerAmount = BigNumber.from(
                    metaData.remainingFillableTakerAmount
                )
                    .mul(BigNumber.from(order.makerAmount))
                    .div(BigNumber.from(order.takerAmount))
                orders.nbrOptions = formatUnits(remainingFillableMakerAmount, decimals)
            } else {
                orders.nbrOptions = formatUnits(
                    BigNumber.from(order.makerAmount),
                    decimals
                )
            }
        }
        return orders
    })

    return orderbook
}

export const createTable = (buyOrders: any, sellOrders: any) => {
    // Get orderbook table length
    const buyOrdersCount = buyOrders !== 'undefined' ? buyOrders.length : 0
    const sellOrdersCount = sellOrders !== 'undefined' ? sellOrders.length : 0
    const tableLength =
        buyOrdersCount >= sellOrdersCount ? buyOrdersCount : sellOrdersCount

    const table: any = []
    if (tableLength === 0) {
        return table
    } else {
        for (let j = 0; j < tableLength; j++) {
            const buyOrder = buyOrders[j]
            const sellOrder = sellOrders[j]
            const row = {
                buyExpiry: buyOrder?.expiry == null ? '-' : buyOrder.expiry + ' mins',
                buyQuantity: buyOrder?.nbrOptions == null ? '' : buyOrder.nbrOptions,
                bid: buyOrder?.bid == null ? '' : buyOrder.bid,
                sellExpiry:
                    sellOrder?.expiry == null ? '-' : sellOrder.expiry + ' mins',
                sellQuantity: sellOrder?.nbrOptions == null ? '' : sellOrder.nbrOptions,
                ask: sellOrder?.ask == null ? '' : sellOrder.ask,
            }
            table.push(row)
        }
        return table
    }
}

// @todo needed?
export const getAddress = (address: string) => {
    return ethers.utils.getAddress(address)
}

export const getResponse = (
    makerToken: string,
    firstOrdersBid: Record[],
    secondOrdersBid: Record[]
) => {
    let responseSell: Record[] = []
    let responseBuy: Record[] = []
    // Get responseBuy and responseSell using makerToken
    if (firstOrdersBid.length !== 0) {
        // If the bids for the first order is not empty
        const bidOrder = firstOrdersBid[0].order
        if (getAddress(bidOrder.makerToken) === getAddress(makerToken)) {
            responseBuy = secondOrdersBid
            responseSell = firstOrdersBid
        } else {
            responseBuy = firstOrdersBid
            responseSell = secondOrdersBid
        }
        // If the bids for the first order is empty and the bids for the second order is not empty
    } else if (secondOrdersBid.length !== 0) {
        const bidOrder = secondOrdersBid[0].order
        if (getAddress(bidOrder.makerToken) === getAddress(makerToken)) {
            responseBuy = firstOrdersBid
            responseSell = secondOrdersBid
        } else {
            responseBuy = secondOrdersBid
            responseSell = firstOrdersBid
        }
    }

    return {
        responseBuy,
        responseSell,
    }
}
