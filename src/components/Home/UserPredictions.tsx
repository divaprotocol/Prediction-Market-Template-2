import React, { useContext, useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { NotFunctional } from '../common/NotFunctional'
import { TransactionInProcess } from '../common/TransactionInProcess'
import { TransactionFailed } from '../common/TransactionFailed'
import { TransactionSuccessful } from '../common/TransactionSuccessful'
import { useQuery } from 'react-query'
import request, { gql } from 'graphql-request'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { formatUnits, parseUnits } from 'ethers/lib/utils'
import { AppConfig } from '@/config'
import Web3 from 'web3'
import ERC20_ABI from '@/abi/ERC20ABI.json'
import DIVA_ABI from '@/abi/DIVAABI.json'
import { SellOrderModal } from './SellOrderModal'
import { PoolContext } from '.'
import { BigNumber, ethers, } from 'ethers'
import { scrollToTop, ZERO } from '@/utils'
import Image from 'next/image'
import TransactionContext from '@/components/context/TransactionContext'
import { ChainChecker } from '@/components/common/ChainChecker'
import { OrderFill } from '@/types/0x-subgraph-types'

// import { useQueryClient } from 'react-query';

const contractAddress = require('@0x/contract-addresses')

// @todo remove?
type FilledOrder = {
	type: string
	maxLoss: string
	paidReceived: string
	maxProfit: string
	timestamp: number
	id: string
	isLong: boolean
}

// @todo add takerTokenFilledAmount once available in the graph
// @todo Move into queries file and the types above into 0x-subgraph-types
export const queryOrderFillsTaker = (address: string) => gql`
	{
		nativeOrderFills(
			where: { taker: "${address}" }
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

export const queryOrderFillsMaker = (address: string) => gql`
	{
		nativeOrderFills(
			where: { maker: "${address}" }
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

export const queryDIVALiquidity = (poolId: string, address: string) => gql`
	{
		liquidities(where: {pool: "${poolId}", msgSender: "${address}"}) {
			pool {
				id
			}
			eventType
			collateralAmount
			id
			longTokenHolder
			shortTokenHolder
			msgSender
			timestamp
		}
	}
`

// {
// 	liquidities(where: {pool: "0x26a3ea71acbffa9bb6cbdba8264c25675033b6316b855e1e4c5a0d42dc115c45", longTokenHolder: "0x7F5c306f0Da62CA198d55561de87041345937609"}) {
// 		pool {
// 			id
// 		}
// 		eventType
// 		collateralAmount
// 		id
// 		longTokenHolder
// 		shortTokenHolder
// 		msgSender
// 		timestamp
// 	}
// }

export const queryDIVAClaims = (poolId: string, address: string) => gql`
	{
		claims(
			where: {pool: "${poolId}", returnedTo: "${address}"}
		) {
			id
			pool {
				id
			}
			amountPositionToken
			collateralAmountReturned
			returnedTo
			positionToken {
				id
			}
			timestamp
		}
	}
`

// @todo in Your predictions table, show only net position. If user has 10 long and 10 short, then don't show them
// in positions but show message that he can redeem? -> But what if a user just wants to sell one side instead. In this case
// it's still valuable to see the positions. Maybe add some toggle?

export const UserPredictions = () => {
	// console.log("Rendering UserPredictions")
	const { login } = usePrivy()
	const { pool, chainId, data } = useContext(PoolContext) // question: Is this pool data cached somehow or is it queried multiple times while user interacts with the app?
	const supportedChainOrderInfo = data[chainId].orderInfo // chainId is the chain specified in the config.
	

	// const queryClient = useQueryClient();

	const [sellPrediction, setSellprediction] = useState(false)
	const [transactionProcess, setTransactionProcess] = useState(false)
	const [failed, setFailed] = useState(false)
	const [longTokenHistory, setLongTokenHistory] = useState<[]>([])
	const [shortTokenHistory, setShortTokenHistory] = useState<[]>([])
	const { transactionStatus, setTransactionStatus } = useContext(TransactionContext);
	const yesOutcomeToken = AppConfig.yesOutcomeToken;
	const enableSell = AppConfig.enableSell;

	// State to store the last transaction that was triggered within the `UserPredictions` component, `handleRemoveLiquidity` or `handleClaim`.
	// This is used to identify the type of transaction that failed and to trigger the retry function.
	const [transactionType, setTransactionType] = useState('');

	const [minPositionTokenBalance, setMinPositionTokenBalance] = useState(ZERO);
	const [claimStatus, setClaimStatus] = useState(false); // false means not claimed, true means claimed
	
	// Wallet connection
	const { wallets } = useWallets()

	// Select most recently connected wallet: https://docs.privy.io/guide/react/wallets/use-wallets#get-wallet
	const wallet = wallets[0]
	const userAddress = wallet?.address

	const activeChainId = wallets.length > 0 ? Number(wallets[0].chainId.split(':')[1]) : 0

	// Provider
	const [web3Provider, setWeb3Provider] = useState<any>()

	const [actualProfitLoss, setActualProfitLoss] = useState(0);


	const [showSellModal, setShowSellModal] = useState(false)
	const [predictionData, setPredictionData] = useState('')
	const [longPrediction, setLongPrediction] = useState([])
	const [shortPrediction, setShortPrediction] = useState([])
	
	enum Direction {
		Long = 'long',
		Short = 'short',
		Neutral = 'neutral'
	}	

	type NetPosition = {
		paid: number;
		receivedInclReceivable: number;
		netPaid: number;
		maxPayoutRemaining: number;
		direction: Direction;
		netPosition: number;
		netPositionRounded: number;
		cashOutAmount: number;
		claimable: number;
		isClaimed: boolean;
		displayLine: boolean;
	};
	const [netPosition, setNetPosition] = useState<NetPosition | null>(null)

	type TokenBalances = {
		longTokenBalance: BigNumber;
		shortTokenBalance: BigNumber;
		collateralTokenBalance: BigNumber;
	};
	const [tokenBalances, setTokenBalances] = useState<TokenBalances | null>(null);

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


	const chainContractAddress =
		contractAddress.getContractAddressesForChainOrThrow(chainId)
	const exchangeProxy = chainContractAddress.exchangeProxy
	
	const web3 = new Web3(web3Provider as any)

	const divaAddress = AppConfig.diva

	useEffect(() => {
		const setProvider = async () => {
			const provider = await wallets[0]?.getWeb3jsProvider()
			setWeb3Provider(provider)
		}
		setProvider()

		// @todo question why not include the orderFill queries here and then store them in state?
		// should be updated in real-time though if there are any changes to positions (e.g., buys via 
		// DIVA App) 

	}, [wallets])

	// @notice Function to fetch 0x orders filled by the connected wallet address (taker). Triggered when the component first mounts due to the
	// use of useQuery. The query is uniquely identified by the key 'orderFills'.
	// @dev The query depends on the user address and the chainId. If the user changes chain, the query is updated.
	// The query only runs if userAddress is truthy.
	// @todo -> Restriction to relevant tokens is done later. Can we adjust the query to fetch only the relevant tokens?
	const {
		data: orderFillsTaker,
		isLoading: isOrderFillsTakerLoading,
		isError: isOrderFillsTakerError
	} = useQuery<OrderFill[]>(['orderFillsTaker', userAddress, transactionStatus], async () => {
		const response = request(
			AppConfig.graphUrl,
			queryOrderFillsTaker(userAddress)
		).then((orders: any) => {
			if (orders.nativeOrderFills != null) {
				return orders.nativeOrderFills
			} else {
				console.log('Fill orders where user = taker not available')
				return {}
			}
		})
		return response
	}, {
		enabled: !!userAddress  // This line ensures the query only runs if userAddress is truthy
	})

	// @todo fix issue: when a market maker account just sold tokens, then Your predictions should be empty
	// but it shows weird figures

	// @todo that seems to be exactly the same function as orderFills above -> why is it needed here?
	const {
		data: orderFillsMaker,
		isLoading: isOrderFillsMakerLoading,
		isError: isOrderFillsMakerError
	} = useQuery<OrderFill[]>(['orderFillsMaker', userAddress, transactionStatus], async () => {
		const response = request(
			AppConfig.graphUrl,
			queryOrderFillsMaker(userAddress)
		).then((orders: any) => {
			if (orders.nativeOrderFills != null) {
				return orders.nativeOrderFills
			} else {
				console.log('Fill orders where user = maker not available')
				return {}
			}
		})
		return response
	}, {
		enabled: !!userAddress  // This line ensures the query only runs if userAddress is truthy
	})

	const {
		data: liquidityEvents,
		isLoading: isLiquidityEventsLoading,
		isError: isLiquidityEventsError
	} = useQuery<any[]>(['liquidity', userAddress, transactionStatus], async () => { // @todo update return type
		const response = request(
			AppConfig.graphUrl,
			queryDIVALiquidity(pool?.id ?? '', userAddress)
		).then((data: any) => {
			if (data.liquidities != null) {
				return data.liquidities
			} else {
				console.log('No liquidity events found')
				return {}
			}
		})
		return response
	}, {
		enabled: !!userAddress  // This line ensures the query only runs if userAddress is truthy
	})

	const {
		data: claimEvents,
		isLoading: isClaimEventsLoading,
		isError: isClaimEventsError
	} = useQuery<any[]>(['claim', userAddress, transactionStatus], async () => { // @todo update return type
		const response = request(
			AppConfig.graphUrl,
			queryDIVAClaims(pool?.id ?? '', userAddress)
		).then((data: any) => {
			if (data.claims != null) {
				return data.claims
			} else {
				console.log('No claim events found')
				return {}
			}
		})
		return response
	}, {
		enabled: !!userAddress  // This line ensures the query only runs if userAddress is truthy
	})
	


	const longTokenAddress = pool?.longToken.id // @todo rename to yesTokenAddress and query it from pool.json (low priority)
	const shortTokenAddress = pool?.shortToken.id // @todo rename to noTokenAddress and query it from pool.json (low priority) 
	const collateralTokenAddress = pool?.collateralToken.id // @todo consider pulling it from pool.json -> No, keep just the poolId as input in config.ts

	const handleOrderFills = async (
		orderFillsTaker: any,
		orderFillsMaker: any,
		liquidityEvents: any, // @todo Specify a more precise type
		claimEvents: any,  // @todo Specify a more precise type
		tokenBalances: TokenBalances
	) => {
		if (
			orderFillsTaker &&
			orderFillsMaker &&
			liquidityEvents &&
			claimEvents &&
			wallet?.address &&
			web3Provider
		) {
			let paidBN = ZERO;
			let receivedBN = ZERO;
			let cumulativeLongTokens = ZERO;
			let cumulativeShortTokens = ZERO;
			let netPositionBN: BigNumber
			let direction: Direction
			let netPaidBN: BigNumber
			let claimedCollateralAmountLongBN = ZERO;
			let claimedCollateralAmountShortBN = ZERO;
			let burntPositionTokenAmountLongBN = ZERO;
			let burntPositionTokenAmountShortBN = ZERO;
			let claimableBN = ZERO;
			let liquidityRemovedBN = ZERO;
			let liquidityAddedBN = ZERO;
			const decimals: number = pool?.collateralToken.decimals ?? 0

			const divaFee = BigNumber.from(pool?.protocolFee).add(BigNumber.from(pool?.settlementFee)) // 18 decimals
			const divaFeeMultiplicator = (parseUnits('1').sub(divaFee)).div(parseUnits('1', 18 - decimals)) // 1-divaFee (converted into decimals)

			// @todo if someone minted new tokens, then received will increase due to receivable and then paid should also increase by the same amount


			// All orders where user acted as the taker for long tokens
			// @todo consolidate the two parts as the only change is the long and short token address -> make it a function
			orderFillsTaker.map((order: any) => {
				if (order.maker === order.taker) {
					// Ignore orders where user bought from himself
					return
				}

				if (
					collateralTokenAddress && longTokenAddress &&
					order.makerToken.toLowerCase() ===
						longTokenAddress.toLowerCase() &&
					order.takerToken.toLowerCase() ===
						collateralTokenAddress.toLowerCase()
				) {
					// User long token purchases
					paidBN = paidBN.sub(BigNumber.from(order.takerTokenFilledAmount).add(order.takerTokenFeeFilledAmount))
					cumulativeLongTokens = cumulativeLongTokens.add(order.makerTokenFilledAmount)
				} else if (
					collateralTokenAddress && longTokenAddress &&
					order.makerToken.toLowerCase() ===
						collateralTokenAddress.toLowerCase() &&
					order.takerToken.toLowerCase() === longTokenAddress.toLowerCase()
				) {
					// User long token sales
					receivedBN = receivedBN.add(order.makerTokenFilledAmount) // that's the amount that the buyer of the long tokens paid you effectively
					cumulativeLongTokens = cumulativeLongTokens.sub(BigNumber.from(order.takerTokenFilledAmount).add(order.takerTokenFeeFilledAmount))
				}
			})

			// @todo Do we need the same block with orderFillsMaker?

			// @todo add takerFeeFilledAmount -> has to be added in the subgraph first

			// @todo do we need to handle maker == taker cases?

			// All orders where user acted as the taker for short tokens
			orderFillsTaker.map((order: any) => {
				if (order.maker === order.taker) {
					// Ignore orders where user bought from himself
					return
				}

				if (
					collateralTokenAddress && shortTokenAddress &&
					order.makerToken.toLowerCase() ===
						shortTokenAddress.toLowerCase() &&
					order.takerToken.toLowerCase() ===
						collateralTokenAddress.toLowerCase()
				) {
					// User short token purchases
					paidBN = paidBN.sub(BigNumber.from(order.takerTokenFilledAmount).add(order.takerTokenFeeFilledAmount))
					cumulativeShortTokens = cumulativeShortTokens.add(order.makerTokenFilledAmount)
				} else if (
					collateralTokenAddress && shortTokenAddress &&
					order.makerToken.toLowerCase() ===
						collateralTokenAddress.toLowerCase() &&
					order.takerToken.toLowerCase() === shortTokenAddress.toLowerCase()
				) {
					// User short token sales
					receivedBN = receivedBN.add(order.makerTokenFilledAmount) // that's the amount that the buyer of the short tokens paid you effectively
					cumulativeShortTokens = cumulativeShortTokens.sub(BigNumber.from(order.takerTokenFilledAmount).add(order.takerTokenFeeFilledAmount))
				} 
			})

			// All orders where user acted as the maker for long tokens
			orderFillsMaker.map((order: any) => {
				if (order.maker === order.taker) {
					// Ignore orders where user bought from himself
					return
				}

				if (
					collateralTokenAddress && longTokenAddress &&
					order.makerToken.toLowerCase() ===
						longTokenAddress.toLowerCase() &&
					order.takerToken.toLowerCase() ===
						collateralTokenAddress.toLowerCase()
				) {
					// User long token sales (Sell Limit orders created which were filled)
					receivedBN = receivedBN.add(order.takerTokenFilledAmount) // Amount of collateral token the user receives
					cumulativeLongTokens = cumulativeLongTokens.sub(order.makerTokenFilledAmount)
				} else if (
					collateralTokenAddress && longTokenAddress &&
					order.makerToken.toLowerCase() ===
						collateralTokenAddress.toLowerCase() &&
					order.takerToken.toLowerCase() === longTokenAddress.toLowerCase()
				) {
					// User long token purchases (Buy Limit orders created which were filled)
					paidBN = paidBN.sub(order.makerTokenFilledAmount)
					cumulativeLongTokens = cumulativeLongTokens.add(order.takerTokenFilledAmount)
				}
			})

			// All orders where user acted as the maker for short tokens
			orderFillsMaker.map((order: any) => {
				if (order.maker === order.taker) {
					// Ignore orders where user bought from himself
					return
				}

				if (
					collateralTokenAddress && shortTokenAddress &&
					order.makerToken.toLowerCase() ===
						shortTokenAddress.toLowerCase() &&
					order.takerToken.toLowerCase() ===
						collateralTokenAddress.toLowerCase()
				) {
					// User short token sales (Sell Limit orders created which were filled)
					receivedBN = receivedBN.add(order.takerTokenFilledAmount) // Amount of collateral token the user receives
					cumulativeShortTokens = cumulativeShortTokens.sub(order.makerTokenFilledAmount)
				} else if (
					collateralTokenAddress && shortTokenAddress &&
					order.makerToken.toLowerCase() ===
						collateralTokenAddress.toLowerCase() &&
					order.takerToken.toLowerCase() === shortTokenAddress.toLowerCase()
				) {
					// User short token purchases (Buy Limit orders created which were filled)
					paidBN = paidBN.sub(order.makerTokenFilledAmount)
					cumulativeShortTokens = cumulativeShortTokens.add(order.takerTokenFilledAmount)
				}
			})

			liquidityEvents.map((item: any) => {
				if (item.eventType === 'Removed') {
					liquidityRemovedBN = liquidityRemovedBN.add(item.collateralAmount) // gross of DIVA fee!
				} else if (item.eventType === 'Added' || item.eventType === 'Issued') {
					liquidityAddedBN = liquidityAddedBN.add(item.collateralAmount)
					paidBN = paidBN.sub(item.collateralAmount)
					// receivedBN = receivedBN.add(BigNumber.from(item.collateralAmount).mul(divaFeeMultiplicator).div(parseUnits('1', decimals)))
				} else {
					console.log("No liquidity events found for connected account")
				}
			})

			if (pool?.statusFinalReferenceValue === 'Confirmed') {
				claimEvents.map((item: any) => {
					if (item.positionToken.id === longTokenAddress) {
						claimedCollateralAmountLongBN = claimedCollateralAmountLongBN.add(item.collateralAmountReturned) // net of DIVA fee
						burntPositionTokenAmountLongBN = burntPositionTokenAmountLongBN.add(item.amountPositionToken) // gross of DIVA fee
					} else if (item.positionToken.id === shortTokenAddress) {
						claimedCollateralAmountShortBN = claimedCollateralAmountShortBN.add(item.collateralAmountReturned) // net of DIVA fee
						burntPositionTokenAmountShortBN = burntPositionTokenAmountShortBN.add(item.amountPositionToken) // gross of DIVA fee
					}					
				})
			}
			
			

			// @todo question: Do we need to take into account remainingFillableTakerAmount somewhere?

			// Minimum position token balance derived based on 0x trade history
			const minPositionTokenBalanceBasedOn0xTradesBN = (cumulativeShortTokens.lt(cumulativeLongTokens) ? cumulativeShortTokens : cumulativeLongTokens)
			
			// Collateral amount to be received if submitted for liquidity removal in DIVA Protocol
			const minPositionTokenBalanceBasedOn0xTradesNetBN = minPositionTokenBalanceBasedOn0xTradesBN.mul(divaFeeMultiplicator).div(parseUnits('1', decimals))

			// Adjust minimum position token balance derived from historical 0x trades by user's remove liquidity
			// activities on DIVA Protocol. This value is used as input in `removeLiquidity` smart contract function call during early cashout.
			const minPositionTokenBalanceBasedOn0xTradesAdjustedBN = minPositionTokenBalanceBasedOn0xTradesBN.add(liquidityAddedBN).sub(liquidityRemovedBN);
			setMinPositionTokenBalance(minPositionTokenBalanceBasedOn0xTradesAdjustedBN);

			// This is the amount of collateral the user receives when removing liquidity from DIVA Protocol, also referred to as cashout amount. 
			// This is the value included in the Received and Claimable columns.
			const minPositionTokenBalanceBasedOn0xTradesAdjustedNetBN = minPositionTokenBalanceBasedOn0xTradesAdjustedBN.mul(divaFeeMultiplicator).div(parseUnits('1', decimals)) // @todo needs to take into account the payout to be received after the pool was confirmed
			
			// Determine the user's net direction. Neutral if the user holds the same amount of LONG and SHORT position tokens
			direction = cumulativeShortTokens.gt(cumulativeLongTokens) ? Direction.Short : (cumulativeLongTokens.gt(cumulativeShortTokens) ? Direction.Long : Direction.Neutral);
			
			// Calculate the value `receivedInclReceivableBN` to be displayed in Received column. If the final value is confirmed, the value is calculated as the sum of the
			// historical position token sales via 0x Protocol and the actual payout amounts. If the final value is not yet confirmed, the value is
			// calculated as the sum of the historical position token sales and the amount that can be removed via `removeLiquidity` from DIVA Protocol.
			// `receivedInclReceivableBN` is net of DIVA fees.
			let finalPayoutReceivableLong = ZERO;
			let finalPayoutReceivableShort = ZERO;
			let receivedInclReceivableBN = ZERO;
			if (pool?.statusFinalReferenceValue === "Confirmed") {
				// If final value is confirmed, the received amount. Note that payoutLong and payoutShort are already net of fees,
				// hence no fee calculation is needed here.
				netPositionBN = BigNumber.from(0); // Set net position to zero when pool status is Confirmed
				if (tokenBalances) {
					// Note that after claim, longTokenBalance / shortTokenBalance will be 0, hence finalPayoutReceivableLong will be zero as well
					finalPayoutReceivableLong = BigNumber.from(pool.payoutLong).mul(tokenBalances?.longTokenBalance).div(parseUnits('1', decimals))
					finalPayoutReceivableShort = BigNumber.from(pool.payoutShort).mul(tokenBalances?.shortTokenBalance).div(parseUnits('1', decimals))
					
					// `receivedBN` represents the position token sales via 0x Protocol. After claim, finalPayoutReceivableLong and finalPayoutReceivableShort
					// will be zero
					receivedInclReceivableBN = receivedBN
						.add(finalPayoutReceivableLong)
						.add(finalPayoutReceivableShort)
						.add(claimedCollateralAmountLongBN)
						.add(claimedCollateralAmountShortBN)
					claimableBN = finalPayoutReceivableLong.add(finalPayoutReceivableShort)
				}
			} else {
				// Scenario where final value is not yet confirmed.
				// Note that it doesn't matter whether the user has removed liquidity. The receivable is the sum of sales proceeds and the removable amount based on 0x trades.
				receivedBN = receivedBN.add(liquidityAddedBN.mul(divaFeeMultiplicator).div(parseUnits('1', decimals)))
				receivedInclReceivableBN = receivedBN.add(minPositionTokenBalanceBasedOn0xTradesNetBN)
				claimableBN = minPositionTokenBalanceBasedOn0xTradesAdjustedNetBN

				// Calculate user's net position
				netPositionBN = direction === Direction.Long 
								? cumulativeLongTokens.sub(cumulativeShortTokens)
								: cumulativeShortTokens.sub(cumulativeLongTokens);
			} 

			// @todo using direction here means that we are only looking at trades via 0x protocol. We are ignoring gifts / free transfers
			// that the user may have received.
			let isClaimed = false
			// @todo test if partially claimed (needs hard-coding of amount in redeemPositionToken function)
			if (
				(claimedCollateralAmountLongBN.gt(0) && tokenBalances?.longTokenBalance.eq(ZERO)) || 
				(claimedCollateralAmountShortBN.gt(0) && tokenBalances?.shortTokenBalance.eq(ZERO))
			) {
				isClaimed = true
			}

			const netPosition = Number(formatUnits(netPositionBN, decimals))
			const netPositionRounded = roundToPrecision(netPosition, 3) // @todo Important to mention that Outcome will show "-" after pool is confirmed because netPositionBN is set to zero when pool is confirmed (see if block above). Check whether you want to handle it

			// Calculate user's max payout net of DIVA Protocol fees.
			const netPositionMaxPayoutNetBN = netPositionBN.mul(divaFeeMultiplicator).div(parseUnits('1', decimals))

			// Calculate net paid
			netPaidBN = paidBN.add(receivedInclReceivableBN)

			
			// @todo implement Liquidity entity from subgraph to get removeLiquidity events
			// Claim events

			// @todo consider calculating those values outside of this function and only set the figures that are needed
			// for the calcs as state (see React docs for best practice in grouping/structing state)

			// Convert BigNumbers into Numbers that can be displayed in the app
			const cashOutAmount = Number(formatUnits(minPositionTokenBalanceBasedOn0xTradesAdjustedNetBN, decimals))
			const claimable = Number(formatUnits(claimableBN, decimals))
			const paid = Number(formatUnits(paidBN, decimals))
			const receivedInclReceivable = Number(formatUnits(receivedInclReceivableBN, decimals))
			const netPaid = Number(formatUnits(netPaidBN, decimals))
			const maxPayoutRemaining = Number(formatUnits(netPositionMaxPayoutNetBN, decimals))
			const displayLine = direction !== Direction.Neutral || maxPayoutRemaining !== 0 || netPaid !== 0 || netPosition !== 0 || paid !== 0 || receivedInclReceivable !== 0;
			
			// @todo In Sell, it shows the NO balance and not the net balance -> may be confusing for the user

			// @todo if a different chain is selected, then the app should ask the use to switch to the corresponding chain. Currently, the app is breaking

			// @todo could this be a non-array? Just an object? -> netPosition.length wouldn't work then

			// @todo Add mobile view for Your Positions

			setNetPosition(
				{
					paid,
					receivedInclReceivable,
					netPaid,
					maxPayoutRemaining,
					direction,
					netPosition,
					netPositionRounded,
					cashOutAmount,
					claimable,
					isClaimed,
					displayLine,
				}
			)

			// @todo add expected balance check with balanceOf and if inconsistent, then don't show any numbers as discussed with Sascha


			// @todo in order to set cashout amount to zero, I need the info from the subgraph that removeLiquidity was done
		}
	}

	const getTokenBalances = async () => {
		if (!wallet) {
			console.log("No wallet connected.");
			return;
		}
	
		try {
			const provider = await wallet.getEthersProvider();
			const signer = provider.getSigner();
	
			if (longTokenAddress && shortTokenAddress && collateralTokenAddress) {
				const longTokenContract = new ethers.Contract(longTokenAddress, ERC20_ABI as any, signer);
				const shortTokenContract = new ethers.Contract(shortTokenAddress, ERC20_ABI as any, signer);
				const collateralTokenContract = new ethers.Contract(collateralTokenAddress, ERC20_ABI as any, signer);
	
				const longTokenBalance = await longTokenContract.balanceOf(userAddress);
				const shortTokenBalance = await shortTokenContract.balanceOf(userAddress);
				const collateralTokenBalance = await collateralTokenContract.balanceOf(userAddress);
	
				setTokenBalances({
					longTokenBalance,
					shortTokenBalance,
					collateralTokenBalance
				});
			}
		} catch (error) {
			console.error("Failed to fetch token balances:", error);
		}
	}

	// useEffect(() => {
	// 	calculateClaimable()
	// }, [netPosition])


	// @todo I need to adjust Paid and Max loss if liquidity is removed. Or maybe just hide the line if "Max Profit" = 0
	// useEffect(() => {
	// 	console.log("IM TRIGGERED")
	// 	console.log("userAddress", userAddress)
	// 	getTokenBalances()
	// 	handleOrderFills(longTokenAddress, shortTokenAddress) // @todo rename
	// }, [
	// 	collateralTokenAddress,
	// 	orderFillsTaker.data,
	// 	orderFillsMaker.data,
	// 	pool?.collateralToken.decimals,
	// 	longTokenAddress,
	// 	shortTokenAddress,
	// 	wallets,
	// 	userAddress,
	// 	// longPrediction, // @todo activating this causes an infite loop but I need it to update Your Predictions after a predict or sell tx
	// 	// shortPrediction, // @todo activating this causes an infite loop but I need it to update Your Predictions after a predict or sell tx
	// 	web3Provider, // to ensure it updates the Your Predictions table on page reload
	// 	transactionProcess === false
	// ])
	useEffect(() => {
		console.log("Fetching token balances...");
		getTokenBalances();
	  }, [wallet, userAddress, longTokenAddress, shortTokenAddress, collateralTokenAddress, transactionStatus]); // @todo can I set transactionStatus === true as dependency, otherwise it will update twice // Dependencies directly related to fetching token balances
	
	useEffect(() => {
		console.log("Handling order fills...");
		// Check if any queries are still loading
		if (isOrderFillsTakerLoading || isOrderFillsMakerLoading || isLiquidityEventsLoading || isClaimEventsLoading) {
			console.log("Waiting for data to load..."); 
			return; 
		}

		// Check if any queries have errors
		if (isOrderFillsTakerError || isOrderFillsMakerError || isLiquidityEventsError || isClaimEventsError) {
			console.error("Error fetching data from one or more queries.");
			return;
		}

		// Ensure all data is available
		if (!orderFillsTaker || !orderFillsMaker || !liquidityEvents || !claimEvents) {
			console.error("One or more queries did not return data.");
			return;
		}

		// if (tokenBalances) { // Ensure tokenBalances are available before calling
		// 	handleOrderFills(longTokenAddress, shortTokenAddress);
		// }

		// Check if tokenBalances is available
		if (tokenBalances) {
			handleOrderFills(
				orderFillsTaker,
				orderFillsMaker,
				liquidityEvents,
				claimEvents,
				tokenBalances
			);
		}
	// @todo check how long it takes the data to show up in the subgraph and whether the data is immediately updated here
	}, [
		tokenBalances,
		orderFillsTaker,
		orderFillsMaker,
		liquidityEvents,
		claimEvents
	]); // Handle order fills when tokenBalances and other necessary data are ready
	
	// useEffect(() => {
	// 	if (userAddress) {
	// 		queryClient.invalidateQueries(['orderFillsTaker', userAddress]);
	// 		queryClient.invalidateQueries(['orderFillsMaker', userAddress]);
	// 		queryClient.invalidateQueries(['liquidity', userAddress]);
	// 		queryClient.invalidateQueries(['claim', userAddress]);
	// 	}
	// }, [userAddress, queryClient]);

	// @todo it should automatically update the Your Predictions numbers when user predicted. Currently, it doesn't seem to work

	const handleSellPrediction = (netPosition: NetPosition) => { // @todo rename as this function name is misleading in the sell part
		// setPredictionData(netPosition.direction === Direction.Long ? "Yes" : "No")
		setPredictionData((netPosition.direction === Direction.Long && yesOutcomeToken === 'long') ||
			(netPosition.direction === Direction.Short && yesOutcomeToken === 'short') ? "Yes" : "No")

		setShowSellModal(true)
	}

	// @todo check whether the maps are needed here?
	// @todo comment out this part as no longer needed
	// useEffect(() => {
	// 	// Ensure both arrays have at least one item before attempting to calculate the minimum
	// 	if (longPrediction.length > 0 && shortPrediction.length > 0) {
	// 		const minLongProfit = Math.min(...longPrediction.map(p => p.maxProfit));
	// 		const minShortProfit = Math.min(...shortPrediction.map(p => p.maxProfit));
	// 		const minProfit = Math.min(minLongProfit, minShortProfit);
	// 		setCashOutAmount(minProfit);

	// 		const minLongBalance = longPrediction.map(p => BigNumber.from(p.positionTokenBalance))
	// 			.reduce((min, b) => b.lt(min) ? b : min);
	// 		const minShortBalance = shortPrediction.map(p => BigNumber.from(p.positionTokenBalance))
	// 			.reduce((min, b) => b.lt(min) ? b : min);
	// 		const minPositionTokenBalance = minLongBalance.lt(minShortBalance) ? minLongBalance : minShortBalance;
	// 		setMinPositionTokenBalance(minPositionTokenBalance.toString());
	// 	}


	// }, [longPrediction, shortPrediction, transactionProcess === false]); // Depend on these arrays to re-calculate when they change
	

	const handleRemoveLiquidity = async () => {
		setTransactionProcess(true)
		setTransactionType('removeLiquidity')
		const provider = await wallet.getEthersProvider();
		const signer = provider.getSigner();

		const diva = new ethers.Contract(
			divaAddress,
			DIVA_ABI as any,
			signer
		)
		// @todo pull fee from pool entity (it's the one from subgraph)?

		// const signerAddress = await signer.getAddress()
		try {
			// Important note that cost me hours to realize: If the passed amount is too small, the tx
			// will revert, because the protocol fee would be zero. Holy moly.
			const tx = await diva.removeLiquidity(pool?.id, minPositionTokenBalance);
			await tx.wait()

			// Wait for 4 secs for subgraph to index information
			await new Promise((resolve) => setTimeout(resolve, 4000))

			// @todo is it correct here?
			setTransactionProcess(false) // @todo can we integrate it into setTransactionStatus? maybe also setFailed we cn integrate
			setTransactionStatus({ success: true, hash: tx.hash });
			// Optionally, handle post-transaction success (e.g., updating UI or state)
		} catch (error) {
			console.error('Error removing liquidity:', error);
			setFailed(true)
			setTransactionProcess(false)
			// Optionally, handle errors (e.g., displaying error messages to the user)
		}
	}

	const formatCcy = (value: number) => {
		return value < 0 ? `-$${Math.abs(value).toFixed(2)}` : `$${value.toFixed(2)}`
	}

	function roundToPrecision(value: number, roundingPrecision: number): number {
		const factor = Math.pow(10, roundingPrecision)
		return Math.round(value * factor) / factor; // will round to roundingPrecision decimal places
	}

	function getTextClass(value: number, roundingPrecision: number) {
		const roundedValue = roundToPrecision(value, roundingPrecision)
		if (roundedValue > 0) {
			return "text-green-400"; // Green text for positive numbers
		} else if (roundedValue < 0) {
			return "text-red-400";  // Red text for negative numbers
		} else {
			return "";              // No additional class for zero
		}
	}

	const handleClaim = async () => {
		setTransactionProcess(true)
		setTransactionType('claim')
		const provider = await wallet.getEthersProvider();
		const signer = provider.getSigner();

		const diva = new ethers.Contract(
			divaAddress,
			DIVA_ABI as any,
			signer
		)

		// console.log("pool", pool)
		// console.log("pool.longToken.id", pool.longToken.id)

		// // @todo make this part dynamic
		// const positionToken = new ethers.Contract(
		// 	pool.longToken.id,
		// 	ERC20_ABI as any,
		// 	signer
		// )
		

		// const signerAddress = await signer.getAddress()
		try {
			let tx; // Declare tx outside of the if blocks to make it accessible for later use
			// Important note that cost me hours to realize: If the passed amount is too small, the tx
			// will revert, because the protocol fee would be zero. Holy moly.
			// const positionTokenBalance = await positionToken.balanceOf(userAddress);
			// console.log("positionTokenBalance", positionTokenBalance.toString())
			// const tx = await diva.redeemPositionToken(pool?.longToken.id, positionTokenBalance);

			// Claim both, short and long tokens. This is to prevent that the user needs to call
			// remove liquidity if they happen to have the same amount of long and short tokens in their wallet
			// (receivable)
			if (tokenBalances) {
				if (tokenBalances.shortTokenBalance.gt(0) && tokenBalances.longTokenBalance.gt(0)) {
					if (BigNumber.from(pool?.payoutLong).gt(0) && BigNumber.from(pool?.payoutShort).gt(0)) {
						// Does not enter this part if market is binary as only one side can win and never both. But added
						// for the sake of completeness
						tx = await diva.batchRedeemPositionToken([
							{
								positionToken: shortTokenAddress,
								amount: tokenBalances.shortTokenBalance, // Now properly typed
							},
							{
								positionToken: longTokenAddress,
								amount: tokenBalances.longTokenBalance, // Now properly typed
							},
						]); 
						await tx.wait();
					} else if (BigNumber.from(pool?.payoutLong).eq(0) && BigNumber.from(pool?.payoutShort).gt(0)) {
						tx = await diva.redeemPositionToken(shortTokenAddress, tokenBalances.shortTokenBalance)
						await tx.wait()
					} else if (BigNumber.from(pool?.payoutLong).gt(0) && BigNumber.from(pool?.payoutShort).eq(0)) {
						tx = await diva.redeemPositionToken(longTokenAddress, tokenBalances.longTokenBalance)
						await tx.wait()
					} 
				} else if (tokenBalances.shortTokenBalance.gt(0) && tokenBalances.longTokenBalance.eq(0)) {
					tx = await diva.redeemPositionToken(shortTokenAddress, tokenBalances.shortTokenBalance)
					await tx.wait()
				} else if (tokenBalances.shortTokenBalance.eq(0) && tokenBalances.longTokenBalance.gt(0)) {
					tx = await diva.redeemPositionToken(longTokenAddress, tokenBalances.longTokenBalance)
					await tx.wait()
				} else {
					console.log("Nothing to claim")
				}
			}			

			// Wait for 4 secs for subgraph to index information
			await new Promise((resolve) => setTimeout(resolve, 4000))

			// @todo is it correct here?
			setClaimStatus(true);
			setTransactionProcess(false)
			setTransactionStatus({ success: true, hash: tx.hash });
			// Optionally, handle post-transaction success (e.g., updating UI or state)
		} catch (error) {
			console.error('Error claim:', error);
			setFailed(true)
			setTransactionProcess(false)
			// Optionally, handle errors (e.g., displaying error messages to the user)
		}
	}

	// Function to handle retry via the "Try again" button in the `TransactionFailure` component if user rejects transaction or it fails
	const handleRetry = async () => {
		setFailed(false); // Reset the failed state
		if (transactionType === 'removeLiquidity') {
            handleRemoveLiquidity();
        } else if (transactionType === 'claim') {
            handleClaim();
        }
	};

	// For testing only
	const testPool = {...pool, statusFinalReferenceValue: "Confirmed"};
	const [testStatus, setTestStatus] = useState(true);

	// const calculateClaimable = () => {
	// 	let value;
	
	// 	if (netPosition?.displayLine) {
	// 		if (pool?.statusFinalReferenceValue === "Confirmed") {
	// 			if (
	// 				(netPosition.direction === Direction.Long && BigNumber.from(pool.payoutLong).gt(BigNumber.from(0))) ||
	// 				(netPosition.direction === Direction.Short && BigNumber.from(pool.payoutShort).gt(BigNumber.from(0)))
	// 			) {
	// 				value = netPosition.receivedInclReceivable + netPosition.maxPayoutRemaining + netPosition.claimable;
	// 			} else {
	// 				value = -netPosition.netPaid;
	// 			}
	// 		} else {
	// 			value = netPosition.claimable;
	// 		}
	// 		setActualProfitLoss(value); // Update state with the calculated value
	// 	}		
	// }

	// Note this function will rerender when claimStatus switches to true because it's called within the return part below
	const renderButton = (netPosition: NetPosition) => { // @todo add type here
		if (claimStatus) {
			return (
				<button
					className="flex justify-center items-center gap-1 border-[1px] border-solid rounded-md w-[110px] h-[32px] px-4 text-gray-400 bg-gray-100 border-gray-200"
					disabled
				>
					Claimed
				</button>
			);
		} else if (pool?.statusFinalReferenceValue === "Confirmed") {
			// Using the ERC20 balanceOf function for the balance, we allow to users that received position tokens as a gift / via free
			// transfer to claim their payout via the frontend
			const totalPositionTokenBalance = tokenBalances?.shortTokenBalance.add(tokenBalances?.longTokenBalance)
			if (netPosition.isClaimed) {
				return (
					<button
						className="flex justify-center items-center gap-1 border-[1px] border-solid rounded-md w-[110px] h-[32px] px-4 text-gray-400 bg-gray-100 border-gray-200"
						disabled
					>
						Claimed
					</button>
				);
			} else if (totalPositionTokenBalance?.gt(BigNumber.from(0))) {
				// User owns either short or long tokens
				if (
					(tokenBalances?.shortTokenBalance.gt(BigNumber.from(0)) && BigNumber.from(pool.payoutShort).gt(BigNumber.from(0))) || 
					tokenBalances?.longTokenBalance.gt(BigNumber.from(0)) && BigNumber.from(pool.payoutLong).gt(BigNumber.from(0))
				) {
					return (
						<button
							className="flex justify-center items-center gap-1 border-[1px] border-solid rounded-md w-[110px] h-[32px] px-4 text-green-600 bg-green-100 border-green-400"
							onClick={handleClaim}
						>
							Claim 💸
						</button>
					);
				} else {
					return (
						<button
							className="flex justify-center items-center gap-1 border-[1px] border-solid rounded-md w-[110px] h-[32px] px-4 text-gray-400 bg-gray-100 border-gray-200"
							disabled
						>
							No Payout
						</button>
					);
				}
			} else {
				// isClaimed = false and totalPositionTokenBalance = 0 (nothing claimed and not position tokens)
				return (
					<button
						className="flex justify-center items-center gap-1 border-[1px] border-solid rounded-md w-[110px] h-[32px] px-4 text-gray-400 bg-gray-100 border-gray-200"
						disabled
					>
						-
					</button>
				);
			}
		} else {
			return (
				<button
					className="flex justify-center items-center gap-1 border-[1px] border-solid rounded-md w-[110px] h-[32px] px-4 text-red-500 bg-red-50 border-red-400"
					onClick={() => handleSellPrediction(netPosition)}
				>
					Sell
				</button>
			);
		}
	  };
	// @todo Show tooltips for table headers

	const switchNetwork = async () => {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${AppConfig.chainId.toString(16)}` }],
            });
        } catch (switchError) {
            console.error('Could not switch to the network: ', switchError);
        }
    };

	// @todo In below code, the network name (Polygon) is hard-coded -> maker it dynamic based on the chain specified in config
	return (
		
            
		<div className="w-full overflow-auto pt-8 flex flex-col justify-center items-start gap-4 p-4 lg:w-[840px] rounded-2xl border-[1px] border-solid border-gray-200 bg-white">
			<div className="flex gap-2 items-center">
				<Image src="/images/Token.png" alt="token" width={24} height={24} />
				<h2 className="font-semibold text-xl">Your Predictions</h2>
			</div>
			{/* For testing only */}
			{/* <div>
                <button onClick={() => setTestStatus(!testStatus)}>Test</button>
            </div> */}
			{wallet?.address ? (
			<div className="w-full">
			{/* <ChainChecker> */}
				{activeChainId !== AppConfig.chainId ? <div className='flex justify-center items-center text-gray-600'><p>Please <a href="#" className="text-blue-500 cursor-pointer" onClick={(event) => {
                   event.preventDefault();
                   switchNetwork();
               	}}>switch</a> to the Polygon network.</p></div> :
				(!orderFillsTaker || !orderFillsMaker || !liquidityEvents || !claimEvents) ? <div className='text-gray-600'>Loading ...</div> : netPosition?.displayLine ? (
					<div>
						<table className="hidden md:flex flex-col gap-2 w-full">
							<thead className="bg-gray-100 w-full p-2 rounded-lg">
								<tr className="grid grid-cols-7 text-gray-500 font-semibold gap-2 text-center items-center">
									<td>Outcome</td>
									<td>Paid</td>
									<td>Received</td>
									{/* TODO add info box to include that receivables are included here as well */}
									<td>Net Paid (-) / Received (+)</td>
									<td>Max Payout Remaining</td>
									<td>Claimable</td>
									<td></td>
								</tr>
							</thead>
							<tbody>
								<tr className='grid grid-cols-7 items-center text-gray-600 gap-2 mt-4 text-center'>
									<td className="w-full flex justify-center">
									<span className={netPosition.netPositionRounded === 0
											? 'text-gray-400'
											: twMerge('rounded-md border-[1px] py-[2px] px-[6px]',
										(netPosition.direction === Direction.Long && yesOutcomeToken === 'long' || netPosition.direction === Direction.Short && yesOutcomeToken === 'short')
											? 'border-solid border-green-300 text-green-400 bg-green-50'
											: (netPosition.direction === Direction.Short && yesOutcomeToken === 'long' || netPosition.direction === Direction.Long && yesOutcomeToken === 'short')
											? 'border-solid border-red-300 text-red-400 bg-red-50'
											: ''
									)}>
										{netPosition.netPositionRounded === 0 ? '-' : (netPosition.direction === Direction.Long && yesOutcomeToken === 'long' || netPosition.direction === Direction.Short && yesOutcomeToken === 'short') ? 'YES' : 'NO'}
									</span>
									</td>
									<td className={getTextClass(netPosition.paid, 3)}>{formatCcy(netPosition.paid)}</td>
									<td className={getTextClass(netPosition.receivedInclReceivable, 3)}>{formatCcy(netPosition.receivedInclReceivable)}</td>
									<td className={getTextClass(netPosition.netPaid, 3)}>{formatCcy(netPosition.netPaid)}</td>
									<td className={getTextClass(netPosition.maxPayoutRemaining, 3)}>{formatCcy(netPosition.maxPayoutRemaining)}</td>
									<td className={getTextClass(netPosition.claimable, 3)}>{formatCcy(netPosition.claimable)}</td>
									<td>{enableSell &&renderButton(netPosition)}</td>
								</tr>
							</tbody>
						</table>
						{(netPosition.cashOutAmount >= 0.01 && pool?.statusFinalReferenceValue !== "Confirmed") && (
						<p className="text-sm text-center md:pl-2 md:text-left mt-6 text-gray-400">
							YES and NO positions offset each other. You can convert{' '}
							{/* <span className="text-blue-500">${cashOutAmount.toFixed(2)} to cash</span>. */}
							<button 
								className="text-blue-500 hover:text-blue-700 underline"
								onClick={() => handleRemoveLiquidity()}>${netPosition.cashOutAmount.toFixed(2)} to cash
							</button>.
						</p>
						)}
					</div>
				) : (
					<div className="flex flex-col justify-center items-center w-full gap-4">
						<div className="flex justify-center w-full">
							<h4 className="text-center text-gray-500">
								No Predictions! <br />
								<span className="text-sm text-gray-400">
									Make your first prediction.
								</span>
							</h4>
						</div>
						<div className="flex justify-center w-full">
							<button 
								className="flex items-center justify-center px-4 border-[0.5px] border-solid border-blue-400 rounded-lg text-blue-400 h-[40px] font-semibold"
								onClick={scrollToTop}>
								Predict Now
							</button>
						</div>
					</div>
				)}
			{/* </ChainChecker> */}
			</div>
			) : (
				<div className='flex justify-center items-center text-gray-600 mt-6 mb-6 w-full'>
					<p>Please <a href="#" className="text-blue-500 cursor-pointer" onClick={(event) => {
						event.preventDefault();
						login();
					}}>connect wallet</a> to continue.</p>
				</div>
			)}

			{/* {sellPrediction && (
				<NotFunctional close={() => setSellprediction(false)} />
			)} */}
			{showSellModal && (
				<SellOrderModal
					close={() => {
						setShowSellModal(false)
						// updateOrderBook()
					}}
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
			{/* <div className="flex flex-col gap-2 md:flex-row">
				<button
					className="flex justify-center items-center px-6 h-[48px] rounded-md border-[0.5px] border-solid border-blue-500 text-blue-500 w-full font-semibold"
					onClick={() => setTransactionProcess(true)}>
					Transaction In process Dummy
				</button>
				<button
					className="flex justify-center items-center px-6 h-[48px] rounded-md border-[0.5px] border-solid border-blue-500 text-blue-500 w-full font-semibold"
					onClick={() => setFailed(true)}>
					Transaction Failed Dummy
				</button>
				<button
					className="flex justify-center items-center px-6 h-[48px] rounded-md border-[0.5px] border-solid border-blue-500 text-blue-500 w-full font-semibold"
					onClick={() => setSuccess(true)}>
					Transaction Successful Dummy
				</button>
			</div>
			{transactionProcess && (
				<TransactionInProcess close={() => setTransactionProcess(false)} />
			)}
			{failed && <TransactionFailed close={() => setFailed(false)} />}
			{success && <TransactionSuccessful close={() => setSuccess(false)} />} */}
			{transactionProcess && (
				<TransactionInProcess close={() => setTransactionProcess(false)} />
			)}
			{failed && <TransactionFailed close={() => setFailed(false)} retry={handleRetry} />}
			{transactionStatus?.success && (
				<TransactionSuccessful
					close={() => {
						setTransactionStatus({ success: false, hash: '' });
						close()
					}}
					transactionHash={transactionStatus?.hash || ''}
				/>
			)}
		</div>
		
	
	)
}
