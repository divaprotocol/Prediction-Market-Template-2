import { useContext, useEffect, useState } from 'react'
import { fetch0xOrderbook } from '../../utils/fetch0xOrderbook'
const contractAddress = require('@0x/contract-addresses') // @todo update to import format
import Image from 'next/image'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import {
	createTable,
	get0xOpenOrders,
	getResponse,
	mapOrderData,
} from '@/lib/0xOrders'
import { ORDER_TYPE } from '@/utils/fetchPool'
import { Record, PoolData, WebSocketMessage } from '@/types/0x-api-types'
import request, { gql } from 'graphql-request'
import { useQuery } from 'react-query'
import { PredictionBox } from './PredictionBox'
import { PredictModal } from './PredictModal'
import { Modal } from '../common/Modal'
import { PoolContext } from '.'
import { AppConfig } from '@/config'
import { formatDate } from '../../utils/index'
import { ZERO } from '@/utils'
import TransactionContext from '@/components/context/TransactionContext'
import { OrderFill } from '@/types/0x-subgraph-types'
import { BigNumber } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'
import { toExponentialOrNumber } from '@/utils'

export const queryOrderFillsTotal = (longTokenAddress: string, shortTokenAddress: string) => gql`
{
	nativeOrderFills(
	  where: {
		or: [
			{makerToken: "${longTokenAddress}"},
			{makerToken: "${shortTokenAddress}"},
			{takerToken: "${longTokenAddress}"},
			{takerToken: "${shortTokenAddress}"}]
		}
	) {
	  id
	  orderHash
	  maker
	  taker
	  makerToken
	  takerToken
	  makerTokenFilledAmount
	  takerTokenFilledAmount
	  takerTokenFeeFilledAmount
	  timestamp
	}
  }
`

export const HomeBanner = () => {
	// console.log("Rendering HomeBanner")
	const { transactionStatus } = useContext(TransactionContext);
	const { wallets } = useWallets()
	const { pool, chainId, data } = useContext(PoolContext) // @todo consider clarifying that this is the supportedChain, not the activeChain that the user has selected in the wallet
	const supportedChainOrderInfo = data[chainId].orderInfo
	const homeImage = AppConfig.homeImagePath;
	const yesOutcomeToken = AppConfig.yesOutcomeToken;

	const [market, setMarket] = useState(true)
	const [showPredictModal, setShowPredictModal] = useState(false)
	const [predictionData, setPredictionData] = useState('')
	const [showInfo, setShowInfo] = useState(false)
	const [longOrderBook, setLongOrderBook] = useState(
		supportedChainOrderInfo?.longTokenInfo?.completeOrderBook
	)
	const [shortOrderBook, setShortOrderBook] = useState(
		supportedChainOrderInfo?.shortTokenInfo?.completeOrderBook
	)
	const [isLoading, setIsLoading] = useState(false)
	const [web3Provider, setWeb3Provider] = useState<any>(); // @todo update to use AbstractProvider (type in privy: https://docs.privy.io/reference/sdk/react-auth/interfaces/ConnectedWallet#getweb3jsprovider#interface-connectedwallet)
	const [responseSellForLong, setResponseSellForLong] = useState(
		supportedChainOrderInfo?.longTokenInfo?.rSell
	)
	const [responseBuyForLong, setResponseBuyForLong] = useState(
		supportedChainOrderInfo?.longTokenInfo?.rBuy
	)
	const [responseSellForShort, setResponseSellForShort] = useState(
		supportedChainOrderInfo?.shortTokenInfo?.rSell
	)
	const [responseBuyForShort, setResponseBuyForShort] = useState(
		supportedChainOrderInfo?.shortTokenInfo?.rBuy
	)
	const [totalFilledAmount, setTotalFilledAmount] = useState(ZERO)

	// Store WebSocket client in the state so it can be referenced later to set up handlers
	// for various events like opening a connection, receiving messages, and handling errors
	const [websocketClient, setWebsocketClient] = useState(
		new WebSocket(AppConfig.webSocket)
	)

	const chainContractAddress =
		contractAddress.getContractAddressesForChainOrThrow(chainId)
	const exchangeProxy = chainContractAddress.exchangeProxy

	// handle the case where pool is undefined
	const longTokenAddress = pool?.longToken.id
	const shortTokenAddress = pool?.shortToken.id

	const xURL = AppConfig?.XURL || '';
	const announcementURL = AppConfig?.AnnouncementURL || '';

	// @todo Add aggregation logic in subgraph so you don't have ot deal with pagination stuff here
	const {
		data: orderFillsTotal,
		isLoading: isOrderFillsTotalLoading,
		isError: isOrderFillsTotalError
	} = useQuery<OrderFill[]>(['orderFillsTotal', transactionStatus], async () => {
		console.log("fetching order fills total")
		if (!longTokenAddress || !shortTokenAddress) {
			console.log("Token addresses are undefined.");
			return [];
		}
		const response: { nativeOrderFills: OrderFill[] } = await request(
			AppConfig.graphUrl,
			queryOrderFillsTotal(longTokenAddress, shortTokenAddress)
		);
	
		if (response && response.nativeOrderFills) {
			// Calculate totalFilledAmount using BigNumber for precision
			const totalFilledAmount = response.nativeOrderFills.reduce((acc, order) => {
				acc = BigNumber.from(acc); // Ensure acc is a BigNumber
				// Note that the response only includes fills from the relevant tokens, hence
				// there is no need for additional conditions regarding makerToken and takerToken to equal
				// shortTokenAddress or longTokenAddress.
				// Orders where a user filled their own orders (order.taker == order.maker) are excluded to avoid
				// counting obvious wash trading.
				if (order.taker !== order.maker) {
					if (order.takerToken === pool?.collateralToken.id) {
						return acc.add(BigNumber.from(order.takerTokenFilledAmount)).add(order.takerTokenFeeFilledAmount);
					} else if (order.makerToken === pool?.collateralToken.id) {
						return acc.add(BigNumber.from(order.makerTokenFilledAmount));
					}
				}
				return acc;
			}, ZERO);

			setTotalFilledAmount(totalFilledAmount)
			return response.nativeOrderFills
		} else {
			console.log('No orders have been filled yet');
			setTotalFilledAmount(ZERO)
			return []
		}
	}, {
		enabled: !!longTokenAddress && !!shortTokenAddress
	});



	const fetchOrderBook = async () => {
		setIsLoading(true) // @todo is this used somewhere?
		if (pool && longTokenAddress && shortTokenAddress) {
			const { rBuy: rBuyLong, rSell: rSellLong, completeOrderBook: completeOrderBookLong } = await fetch0xOrderbook(
				pool,
				longTokenAddress,
				chainId
			)
			setResponseSellForLong(rSellLong)
			setResponseBuyForLong(rBuyLong)
			setLongOrderBook(completeOrderBookLong)
	
			const { rBuy: rBuyShort, rSell: rSellShort, completeOrderBook: completeOrderBookShort } = await fetch0xOrderbook(
				pool,
				shortTokenAddress,
				chainId
			)
			setResponseSellForShort(rSellShort)
			setResponseBuyForShort(rBuyShort)
			setShortOrderBook(completeOrderBookShort)
		}

		setIsLoading(false)
	}

	useEffect(() => {
		if (!pool) return
		fetchOrderBook()
	}, [chainId, transactionStatus])

	useEffect(() => {
		const setProvider = async () => {
			const provider = await wallets[0]?.getWeb3jsProvider();
			if (provider) {
				setWeb3Provider(provider); // Maybe use the getEthersProvider here instead? See: https://docs.privy.io/reference/sdk/react-auth/interfaces/PrivyInterface#returns-10#interface-privyinterface
			} else {
				console.log("Provider is undefined");
			}
		}
		setProvider()
	}, [wallets])

	/**
	 * Classifies the set of orders based on the token addresses associated with long and short positions.
	 *
	 * @param {Record[]} orders - The array of order records.
	 * @param {string} longTokenAddress - The address of the long position token.
	 * @param {string} shortTokenAddress - The address of the short position token.
	 * @returns {string} - Returns 'long' if the orders are related to the long position, 'short' if related
	 * to the short position, and 'unknown' if neither.
	 */
	function classifyOrderSet(
		orders: Record[],
		longTokenAddress: string,
		shortTokenAddress: string
	): string {
		if (!orders || orders.length === 0) {
			return 'unknown'
		}

		const firstOrder = orders[0].order

		// If the maker or taker token in the first order in orders array is equal to the longTokenAddress, then
		// these are orders related to the long position token. If it's equal ot the shortTokenAddress, then
		// it's related to the short posotion toknen. Otherwise it will return unknown.
		if (
			firstOrder.makerToken === longTokenAddress ||
			firstOrder.takerToken === longTokenAddress
		) {
			return 'long'
		} else if (
			firstOrder.makerToken === shortTokenAddress ||
			firstOrder.takerToken === shortTokenAddress
		) {
			return 'short'
		}

		return 'unknown'
	}

	//
	useEffect(() => {
		if (websocketClient !== undefined) {
			// Connection opened
			websocketClient.onopen = () => {
				console.log('WebSocket Connected')
			}

			// Listen for messages
			websocketClient.onmessage = (e) => {
				// e.data
				// "[{\"poolId\":\"0x26a3ea71acbffa9bb6cbdba8264c25675033b6316b855e1e4c5a0d42dc115c45\",\"first\":{\"bids\":{\"total\":1,\"page\":1,\"perPage\":1000,\"records\":[{\"order\":{\"signature\":{\"signatureType\":2,\"r\":\"0x8c96059a92b1196ef1af8c2d46831a06139197480280c5e8029a0fc6f7a7aa00\",\"s\":\"0x4f0688feab98aaf08c798e451b11a6916452fa4be38edc996a3da3f16b2c6ab0\",\"v\":28},\"sender\":\"0x0000000000000000000000000000000000000000\",\"maker\":\"0x9adefeb576dcf52f5220709c1b267d89d5208d78\",\"taker\":\"0x0000000000000000000000000000000000000000\",\"takerTokenFeeAmount\":\"30000000000000000000\",\"makerAmount\":\"2340000000000000000000\",\"takerAmount\":\"3000000000000000000000\",\"makerToken\":\"0x40cad342a67bf49a2c384203025ad1ebee1e30c5\",\"takerToken\":\"0x712c359b44a32ca2d61c337414b90db81c9738ca\",\"salt\":\"1712956870801\",\"verifyingContract\":\"0xdef1c0ded9bec7f1a1670819833240f027b25eff\",\"feeRecipient\":\"0x1062ccc9f9a4bbcf565799683b6c00ea525ecb9f\",\"expiry\":\"1744492870\",\"chainId\":137,\"pool\":\"0x0000000000000000000000000000000000000000000000000000000000000000\"},\"metaData\":{\"orderHash\":\"0x0109296f97345be92a137803810ecd6eb08c82035b77c43a241af2adbf09f9ae\",\"remainingFillableTakerAmount\":\"2982068269230769231031\",\"createdAt\":\"2024-04-12T21:21:12.867Z\"}}]},\"asks\":{\"total\":2,\"page\":1,\"perPage\":1000,\"records\":[{\"order\":{\"signature\":{\"signatureType\":2,\"r\":\"0xac2c7cae14de082100318542b52bd85c34f5adc1a1b47ba0adbf69690ebba739\",\"s\":\"0x29c065381cebd65d7d53d82bc5d69a28497835488a2e115fd48f99586d65b7f4\",\"v\":27},\"sender\":\"0x0000000000000000000000000000000000000000\",\"maker\":\"0x9adefeb576dcf52f5220709c1b267d89d5208d78\",\"taker\":\"0x0000000000000000000000000000000000000000\",\"takerTokenFeeAmount\":\"8000000000000000000\",\"makerAmount\":\"1000000000000000000000\",\"takerAmount\":\"800000000000000000000\",\"makerToken\":\"0x712c359b44a32ca2d61c337414b90db81c9738ca\",\"takerToken\":\"0x40cad342a67bf49a2c384203025ad1ebee1e30c5\",\"salt\":\"1712956297092\",\"verifyingContract\":\"0xdef1c0ded9bec7f1a1670819833240f027b25eff\",\"feeRecipient\":\"0x1062ccc9f9a4bbcf565799683b6c00ea525ecb9f\",\"expiry\":\"1744492297\",\"chainId\":137,\"pool\":\"0x0000000000000000000000000000000000000000000000000000000000000000\"},\"metaData\":{\"orderHash\":\"0x4561d424c848c4e448bf3c74da91c4dbb0472fb257681c3a67977964041dce2e\",\"remainingFillableTakerAmount\":\"782629000000000000120\",\"createdAt\":\"2024-04-12T21:11:39.002Z\"}},{\"order\":{\"signature\":{\"signatureType\":2,\"r\":\"0x177caecec12322f07593d1638a22694075084864215219f0526f4b4d200bdc8d\",\"s\":\"0x4d95b41a322baeefa87a99f79f0ccf5ed743c90dbfeef07b34703c765157c465\",\"v\":27},\"sender\":\"0x0000000000000000000000000000000000000000\",\"maker\":\"0x9adefeb576dcf52f5220709c1b267d89d5208d78\",\"taker\":\"0x0000000000000000000000000000000000000000\",\"takerTokenFeeAmount\":\"8200000000000000\",\"makerAmount\":\"1000000000000000000\",\"takerAmount\":\"820000000000000000\",\"makerToken\":\"0x712c359b44a32ca2d61c337414b90db81c9738ca\",\"takerToken\":\"0x40cad342a67bf49a2c384203025ad1ebee1e30c5\",\"salt\":\"1714249138280\",\"verifyingContract\":\"0xdef1c0ded9bec7f1a1670819833240f027b25eff\",\"feeRecipient\":\"0x1062ccc9f9a4bbcf565799683b6c00ea525ecb9f\",\"expiry\":\"1714249738\",\"chainId\":137,\"pool\":\"0x0000000000000000000000000000000000000000000000000000000000000000\"},\"metaData\":{\"orderHash\":\"0xbd3390711c829bf8a0cc7b7fa3533675bfe90015432683041dcb9d2ea83ae137\",\"remainingFillableTakerAmount\":\"820000000000000000\",\"createdAt\":\"2024-04-27T20:18:59.954Z\"}}]}},\"second\":{\"bids\":{\"total\":2,\"page\":1,\"perPage\":1000,\"records\":[{\"order\":{\"signature\":{\"signatureType\":2,\"r\":\"0xac2c7cae14de082100318542b52bd85c34f5adc1a1b47ba0adbf69690ebba739\",\"s\":\"0x29c065381cebd65d7d53d82bc5d69a28497835488a2e115fd48f99586d65b7f4\",\"v\":27},\"sender\":\"0x0000000000000000000000000000000000000000\",\"maker\":\"0x9adefeb576dcf52f5220709c1b267d89d5208d78\",\"taker\":\"0x0000000000000000000000000000000000000000\",\"takerTokenFeeAmount\":\"8000000000000000000\",\"makerAmount\":\"1000000000000000000000\",\"takerAmount\":\"800000000000000000000\",\"makerToken\":\"0x712c359b44a32ca2d61c337414b90db81c9738ca\",\"takerToken\":\"0x40cad342a67bf49a2c384203025ad1ebee1e30c5\",\"salt\":\"1712956297092\",\"verifyingContract\":\"0xdef1c0ded9bec7f1a1670819833240f027b25eff\",\"feeRecipient\":\"0x1062ccc9f9a4bbcf565799683b6c00ea525ecb9f\",\"expiry\":\"1744492297\",\"chainId\":137,\"pool\":\"0x0000000000000000000000000000000000000000000000000000000000000000\"},\"metaData\":{\"orderHash\":\"0x4561d424c848c4e448bf3c74da91c4dbb0472fb257681c3a67977964041dce2e\",\"remainingFillableTakerAmount\":\"782629000000000000120\",\"createdAt\":\"2024-04-12T21:11:39.002Z\"}},{\"order\":{\"signature\":{\"signatureType\":2,\"r\":\"0x177caecec12322f07593d1638a22694075084864215219f0526f4b4d200bdc8d\",\"s\":\"0x4d95b41a322baeefa87a99f79f0ccf5ed743c90dbfeef07b34703c765157c465\",\"v\":27},\"sender\":\"0x0000000000000000000000000000000000000000\",\"maker\":\"0x9adefeb576dcf52f5220709c1b267d89d5208d78\",\"taker\":\"0x0000000000000000000000000000000000000000\",\"takerTokenFeeAmount\":\"8200000000000000\",\"makerAmount\":\"1000000000000000000\",\"takerAmount\":\"820000000000000000\",\"makerToken\":\"0x712c359b44a32ca2d61c337414b90db81c9738ca\",\"takerToken\":\"0x40cad342a67bf49a2c384203025ad1ebee1e30c5\",\"salt\":\"1714249138280\",\"verifyingContract\":\"0xdef1c0ded9bec7f1a1670819833240f027b25eff\",\"feeRecipient\":\"0x1062ccc9f9a4bbcf565799683b6c00ea525ecb9f\",\"expiry\":\"1714249738\",\"chainId\":137,\"pool\":\"0x0000000000000000000000000000000000000000000000000000000000000000\"},\"metaData\":{\"orderHash\":\"0xbd3390711c829bf8a0cc7b7fa3533675bfe90015432683041dcb9d2ea83ae137\",\"remainingFillableTakerAmount\":\"820000000000000000\",\"createdAt\":\"2024-04-27T20:18:59.954Z\"}}]},\"asks\":{\"total\":1,\"page\":1,\"perPage\":1000,\"records\":[{\"order\":{\"signature\":{\"signatureType\":2,\"r\":\"0x8c96059a92b1196ef1af8c2d46831a06139197480280c5e8029a0fc6f7a7aa00\",\"s\":\"0x4f0688feab98aaf08c798e451b11a6916452fa4be38edc996a3da3f16b2c6ab0\",\"v\":28},\"sender\":\"0x0000000000000000000000000000000000000000\",\"maker\":\"0x9adefeb576dcf52f5220709c1b267d89d5208d78\",\"taker\":\"0x0000000000000000000000000000000000000000\",\"takerTokenFeeAmount\":\"30000000000000000000\",\"makerAmount\":\"2340000000000000000000\",\"takerAmount\":\"3000000000000000000000\",\"makerToken\":\"0x40cad342a67bf49a2c384203025ad1ebee1e30c5\",\"takerToken\":\"0x712c359b44a32ca2d61c337414b90db81c9738ca\",\"salt\":\"1712956870801\",\"verifyingContract\":\"0xdef1c0ded9bec7f1a1670819833240f027b25eff\",\"feeRecipient\":\"0x1062ccc9f9a4bbcf565799683b6c00ea525ecb9f\",\"expiry\":\"1744492870\",\"chainId\":137,\"pool\":\"0x0000000000000000000000000000000000000000000000000000000000000000\"},\"metaData\":{\"orderHash\":\"0x0109296f97345be92a137803810ecd6eb08c82035b77c43a241af2adbf09f9ae\",\"remainingFillableTakerAmount\":\"2982068269230769231031\",\"createdAt\":\"2024-04-12T21:21:12.867Z\"}}]}}}]"
				const message: WebSocketMessage = JSON.parse(e.data)

				let orders: WebSocketMessage
				if (pool) {
					// Filter out orders for the specific pool only
					orders = message.filter((item: PoolData) => item.poolId === pool.id)
					
					if (orders.length !== 0) {
						const updateOrders = []
						const checkOrders = orders[0]
	
						// Get first and second order's bids. In first records, baseToken = makerToken and quoteToken = takerToken
						// and in second records, it's the opposite, i.e. baseToken = takerToken and quoteToken = makerToken.
						// That basically means that first record represents the bid and second record the asks for a given position token.
						// @todo can we use better names here? Mbye firstLegBids and secondLegBids?
						// @todo revisit this logic
						const firstRecordsBids = checkOrders.first.bids.records // @todo check 0x API whether it's really called first and second?
						const secondRecordsBids = checkOrders.second.bids.records
						
						// Check whether firstRecordsBids are associated with the long market
						const isLong =
							classifyOrderSet(
								firstRecordsBids,
								longTokenAddress!, // Using non-null assertion here as pool truthy check is done above
								shortTokenAddress! // Using non-null assertion here as pool truthy check is done above
							) === 'long'

						const positionTokenAddress = isLong
							? longTokenAddress!
							: shortTokenAddress!
	
						// Get updated buy and sell limit orders for positionTokenAddress (which is either long or short token)
						// @todo revisit get getResponse function
						const { responseBuy, responseSell } = getResponse(
							positionTokenAddress,
							firstRecordsBids,
							secondRecordsBids
						)
	
						// Get updated orderbook buy data
						// @todo needed? mapOrderData was diva app orderbook specific
						const orderBookBuy = mapOrderData(
							responseBuy,
							pool.collateralToken.decimals,
							ORDER_TYPE.BUY
						)
						updateOrders.push(orderBookBuy)
	
						// Get updated orderbook buy data
						const orderBookSell = mapOrderData(
							responseSell,
							pool.collateralToken.decimals,
							ORDER_TYPE.SELL
						)
						updateOrders.push(orderBookSell)
	
						//put both buy & sell orders in one array to format table rows
						const completeOrderBook = createTable(
							updateOrders[ORDER_TYPE.BUY],
							updateOrders[ORDER_TYPE.SELL]
						)
	
						// Set updated orderbook
						if (isLong) {
							setLongOrderBook(completeOrderBook)
							setResponseSellForLong(responseSell)
							setResponseBuyForLong(responseBuy)
						} else {
							setShortOrderBook(completeOrderBook)
							setResponseSellForShort(responseSell)
							setResponseBuyForShort(responseBuy)
						}
					}				
				} else {
					console.log('Unknown pool id')
				} 				
			}

			websocketClient.onerror = (error) => {
				console.error('WebSocket encountered an error:', error)
			}

			// Cleanup function to avoid memory leaks
			return () => {
				websocketClient.onclose = () => {
					console.log('WebSocket Disconnected')
					setWebsocketClient(new WebSocket(AppConfig.webSocket))
				}
			}
		}
	}, [
		websocketClient.onmessage,
		websocketClient.onopen,
		websocketClient.onclose,
	])

	const updateOrderBook = async () => {
		if (!pool) return
		fetchOrderBook()
	}

	const handlePostQuoteClick = () => {
		const url = `https://app.diva.finance/${pool?.id}/long`
		window.open(url, '_blank');
	}

	const handlePredictModalClose = () => {
		setShowPredictModal(false)
		updateOrderBook()
	}

	return (
		<div className="relative w-full">
			<img
				src={homeImage}
				alt="home"
				className="object-cover w-full h-[1000px] md:h-screen"
			/>
			<div className="absolute top-1 flex flex-col items-center h-full w-full text-center px-14 md:px-20 justify-center">
				<div className="flex flex-col items-center bg-black bg-opacity-[42%] px-4 py-10 rounded-xl">
					<h1 className="font-bold text-3xl md:text-6xl text-center">
						Miami under water by 2050?
					</h1>
					<div className="flex flex-col gap-1 justify-center items-center mt-4 text-[#CBD5E0] text-sm lg:flex-row md:gap-4">
						<h4>${toExponentialOrNumber(Number(formatUnits(totalFilledAmount, pool?.collateralToken.decimals)), 0, 0)} Bet</h4>
						<h4>Expires {pool?.expiryTime && formatDate(Number(pool.expiryTime))}</h4>
						<span className="flex gap-2 text-center items-center">
						{xURL && (
							<a href={xURL} target="_blank" rel="noopener noreferrer">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="25"
									height="25"
									viewBox="0 0 25 25"
									fill="none">
									<path
										d="M20.0992 3.97058L13.8812 11.0348L20.2572 19.9842C20.6912 20.5937 20.9072 20.8979 20.8972 21.1515C20.8928 21.2604 20.8645 21.3671 20.8143 21.464C20.764 21.5608 20.6929 21.6456 20.6062 21.7122C20.4032 21.8673 20.0282 21.8673 19.2782 21.8673H17.5892C17.1342 21.8673 16.9072 21.8673 16.6992 21.8067C16.5157 21.7527 16.3442 21.6643 16.1942 21.5462C16.0242 21.4139 15.8932 21.229 15.6302 20.8601L10.9802 14.3318L4.93916 5.85372C4.50616 5.24423 4.28916 4.93999 4.29916 4.68645C4.30361 4.57743 4.33206 4.47071 4.38251 4.37382C4.43297 4.27693 4.50419 4.19223 4.59116 4.12569C4.79316 3.97058 5.16916 3.97058 5.91916 3.97058H7.60716C8.06216 3.97058 8.28916 3.97058 8.49616 4.03123C8.68002 4.08512 8.85178 4.17355 9.00216 4.29173C9.17216 4.42496 9.30316 4.6089 9.56616 4.97777L13.8822 11.0348M4.34916 21.8673L10.9812 14.3318"
										stroke="white"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</a>
						)}
						{announcementURL && (
                			<a href={announcementURL} target="_blank" rel="noopener noreferrer">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="34"
									height="33"
									viewBox="0 0 34 33"
									fill="none">
									<g clipPath="url(#clip0_87_497)">
										<path
											d="M19.893 14.8113L14.7043 17.807M17.3823 10.5122L18.2471 10.013C19.3939 9.35087 20.7582 9.16883 22.04 9.50689C23.3217 9.84495 24.4159 10.6754 25.0817 11.8156C25.7476 12.9558 25.9307 14.3123 25.5906 15.5867C25.2506 16.8611 24.4153 17.949 23.2685 18.6111L22.4037 19.1104M12.1936 13.508L11.3288 14.0072C10.182 14.6693 9.34675 15.7572 9.0067 17.0316C8.66665 18.306 8.8497 19.6625 9.51558 20.8027C10.1815 21.9429 11.2756 22.7734 12.5574 23.1114C13.8391 23.4495 15.2034 23.2674 16.3502 22.6054L17.215 22.1061"
											stroke="white"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</g>
									<defs>
										<clipPath id="clip0_87_497">
											<rect
												width="23.9657"
												height="23.8968"
												fill="white"
												transform="matrix(0.866025 -0.5 0.504308 0.863524 0.895508 11.9828)"
											/>
										</clipPath>
									</defs>
								</svg>{' '}
							</a>
						)}
						</span>
					</div>
					{/* {longOrderBook?.length == 0 && shortOrderBook?.length == 0 && (
						<button
							className="flex justify-center items-center px-6 h-[48px] rounded-md border-[0.5px] border-solid border-blue-500  font-semibold w-[300px]"
							onClick={() => setMarket((pev) => !pev)}>
							{market ? 'No Market' : 'Show Market'}
						</button>
					)} */}

					{(longOrderBook?.length == 0 && shortOrderBook?.length == 0) ? (
						<div className="flex flex-col gap-2 mt-4 md:mt-10 items-center">
							<h2 className="font-semibold text-xl">No Market! 🙁</h2>
							<h4>Be the first to post quotes</h4>
							<button 
								className="flex border-[0.5px] border-white h-[40px] px-4 items-center rounded-lg bg-white bg-opacity-20 mt-10"
								onClick={handlePostQuoteClick}>
								Post Quote{' '}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="17"
									viewBox="0 0 16 17"
									fill="none">
									<path
										fillRule="evenodd"
										clipRule="evenodd"
										d="M11.8047 4.81355C12.0651 5.0739 12.0651 5.49601 11.8047 5.75636L5.13807 12.423C4.87772 12.6834 4.45561 12.6834 4.19526 12.423C3.93491 12.1627 3.93491 11.7406 4.19526 11.4802L10.8619 4.81355C11.1223 4.5532 11.5444 4.5532 11.8047 4.81355Z"
										fill="white"
									/>
									<path
										fillRule="evenodd"
										clipRule="evenodd"
										d="M4 5.28495C4 4.91676 4.29848 4.61829 4.66667 4.61829H11.3333C11.7015 4.61829 12 4.91676 12 5.28495V11.9516C12 12.3198 11.7015 12.6183 11.3333 12.6183C10.9651 12.6183 10.6667 12.3198 10.6667 11.9516V5.95162H4.66667C4.29848 5.95162 4 5.65314 4 5.28495Z"
										fill="white"
									/>
								</svg>
							</button>
						</div>
					) : (
						<>
							<div className="mt-4 md:mt-10 font-semibold text-xl">
								<h2>What’s your prediction? 🤔</h2>
								<div className="mt-4 flex justify-center gap-6">
									<PredictionBox
										background="bg-green-600"
										setShowPredictModal={() => setShowPredictModal(true)}
										setPredictionData={() => setPredictionData('Yes')}
										up="Yes 👍"
										down={`${
											isLoading || !longOrderBook[0]?.ask
												? ''
												: ((yesOutcomeToken === 'long' ? longOrderBook[0]?.ask : shortOrderBook[0]?.ask) * 100).toFixed(0)
										}% chance`}
									/>
									<PredictionBox
										background="bg-red-600"
										setShowPredictModal={() => setShowPredictModal(true)}
										setPredictionData={() => setPredictionData('No')}
										up="No 👎"
										down={`${
											isLoading || !shortOrderBook[0]?.ask
												? ''
												: ((yesOutcomeToken === 'long' ? shortOrderBook[0]?.ask : longOrderBook[0]?.ask) * 100).toFixed(0)
										}% chance`}
									/>
								</div>
							</div>
							{/* <div className="flex flex-col items-center mt-6 md:mt-10 gap-4">
              <span className="flex items-center gap-4">
                <h4>Quote Type</h4>
                <Image
                  src="/images/info.png"
                  width={18}
                  height={18}
                  alt="info"
                  className="cursor-pointer"
                  onClick={() => setShowInfo(true)}
                />
              </span>
              <div className="flex items-center h-[28px] rounded-full border-[1px] border-solid border-[#BEE3F8] bg-black bg-opacity-30">
                <span
                  className={twMerge(
                    "flex w-[65px] h-[28px]  justify-center items-center cursor-pointer",
                    activeQuote === "¢"
                      ? "bg-blue-100 text-blue-700 rounded-full"
                      : "text-blue-100"
                  )}
                  onClick={() => setActiveQuote("¢")}
                >
                  ¢
                </span>
                <span
                  className={twMerge(
                    "flex justify-center items-center cursor-pointer w-[65px] h-[28px]",
                    activeQuote === "x"
                      ? "bg-blue-100 text-blue-700 rounded-full"
                      : "text-blue-100"
                  )}
                  onClick={() => setActiveQuote("x")}
                >
                  x
                </span>
              </div>
            </div> */}
						</>
					)}
				</div>
			</div>
			{showPredictModal && (
				<PredictModal
					close={handlePredictModalClose}
					predictionData={predictionData}
					pool={pool}
					exchangeProxy={exchangeProxy}
					web3Provider={web3Provider}
					responseSellForLong={responseSellForLong}
					responseBuyForLong={responseBuyForLong}
					responseSellForShort={responseSellForShort}
					responseBuyForShort={responseBuyForShort}
				/>
			)}
			{/* {showInfo && (
				<Modal close={() => setShowInfo(false)}>
					<p className="w-[300px] md:w-full">
						If we would add a sentence like this. 85c represents the price to
						pay to get a chance to win $1, yielding 1.18x your bet. The dollar
						amount shows the volume that is available to bet at this price.
					</p>
				</Modal>
			)} */}
		</div>
	)
}
