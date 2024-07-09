import React, { useCallback, useEffect, useMemo, useRef, useState, useContext } from 'react'
import { twMerge } from 'tailwind-merge'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { BigNumber, ethers } from 'ethers'
import Web3 from 'web3'
import { formatUnits, parseUnits } from 'ethers/lib/utils'
import Image from "next/image";
import { Order as BaseOrder } from '../../types/0x-subgraph-types'; // @todo move into types folder; this is 0x-api type and not 0x-subgraph type
import Link from 'next/link'

import { toExponentialOrNumber } from '@/utils'
import { approve, fillLimitOrders } from '@/lib/fillLimitOrders'
import ERC20_ABI from '@/abi/ERC20ABI.json'
import { Modal } from '../common/Modal'
import { TransactionInProcess } from '../common/TransactionInProcess'
import { TransactionFailed } from '../common/TransactionFailed'
import { TransactionSuccessful } from '../common/TransactionSuccessful'
import TransactionContext from '@/components/context/TransactionContext'
import { TRADING_FEE } from '@/lib/fillLimitOrders'
import debounce from 'lodash/debounce'
import { AppConfig } from '@/config'


const ZERO = BigNumber.from(0)

// Type used in getSellLimitOrders
interface ExtendedOrder extends BaseOrder {
	expectedRate: string
	remainingFillableTakerAmount: string
}

export const PredictModal = ({
	close,
	predictionData,
	pool,
	exchangeProxy,
	web3Provider,
	responseSellForLong,
	responseBuyForLong,
	responseSellForShort,
	responseBuyForShort,
}: {
	close: () => void
	predictionData: string
	pool: any
	exchangeProxy: string
	web3Provider: any
	responseBuyForLong: any
	responseSellForLong: any
	responseBuyForShort: any
	responseSellForShort: any
}) => {
	// console.log("Rendering PredictModal")
	const { ready, authenticated, user, logout, connectWallet, login } = usePrivy()
	const { transactionStatus, setTransactionStatus } = useContext(TransactionContext);
	const [showSummary, setShowSummary] = useState(false)
	const [allowance, setAllowance] = useState<BigNumber>(ZERO)
	const [userInputValue, setUserInputValue] = useState(ZERO)
	const [feeAmount, setFeeAmount] = useState(ZERO)
	const [isAllowanceLoading, setIsAllowanceLoading] = useState(false)
	const [balance, setBalance] = useState('0')
	const [avgExpectedRate, setAvgExpectedRate] = useState({gross: ZERO, net: ZERO})
	const [existingSellLimitOrders, setExistingSellLimitOrders] = useState<ExtendedOrder[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [transactionProcess, setTransactionProcess] = useState(false)
	const [failed, setFailed] = useState(false)
	

	const { wallets } = useWallets()
	// const wallet = useMemo(() => wallets[0], [wallets.length]) // @todo What if user switches between two connected wallets? Then wallets.length will not change and the wallet will not change either, hence using the wrong account
	const wallet = wallets[0]
	const web3 = new Web3(web3Provider as any) // @todo see how it's done in UserPredictions.tsx. It's using web3Provider with useState
	const activeChainId = wallets.length > 0 ? Number(wallets[0].chainId.split(':')[1]) : 0
	// const userAddress = wallet?.address // @todo move userAddress up here -> useState needed?

	const collateralTokenIcon = AppConfig.collateralTokenIconPath;
	const collateralTokenDisplayName = AppConfig.collateralTokenDisplayName;
	const yesOutcomeToken = AppConfig.yesOutcomeToken;
	const collateralToken = useMemo(() => pool?.collateralToken.id, [pool])
	const decimals = useMemo(() => pool?.collateralToken.decimals, [pool])
	const tokenContract = new web3.eth.Contract(ERC20_ABI as any, collateralToken)
	const collateralTokenUnit = useMemo(
		() => parseUnits('1', decimals),
		[decimals]
	)
	const longTokenAddress = pool?.longToken.id // @todo why not useMemo here?
	const shortTokenAddress = pool?.shortToken.id // @todo why not useMemo here?

	const isApproved = useCallback(() => {
		return BigNumber.from(allowance).gt(userInputValue)
	}, [allowance, userInputValue])

	// Set collateral token allowance
	// @todo consider moving the function into a lib as it's being used inside SellOrderModal.tsx as well
	const checkAllowance = async () => {
		if (!collateralToken) {
			console.error("Collateral token address is not set.");
			return;
		}
		const allowance = await tokenContract.methods
			.allowance(wallet?.address, exchangeProxy)
			.call()
		const balance = await tokenContract.methods.balanceOf(wallet?.address).call()
		setBalance(formatUnits(balance, decimals)) // @todo maybe better to store as BigNumber
		setAllowance(allowance)
	}

	// Using debounce to avoid sending rpc requests on every user input
	const checkAllowanceDebounced = useCallback(debounce(() => {
        if (wallet?.address) {
            checkAllowance();
        }
    }, 500), [wallet?.address, checkAllowance]); // Debounce time is 500ms

	// @todo add restriction on trading fee and fee recipient?
	// @todo consider generalizing this function to be used in SellOrderModal.tsx as well
	const getSellLimitOrders = async () => {
		const orders: any = []
		// responseSellForLong, responseSellForShort
		// If user pressed YES and if the long token is associated with the YES outcome, then use the sell limit orders for long tokens, 
		// for the YES market and sell limit orders for short tokens for the NO market. Take the opposite, if `yesOutcomeToken` is 'short'.
		const responseSell = 
			(predictionData === 'Yes' && yesOutcomeToken === 'long') ||
			(predictionData === 'No' && yesOutcomeToken === 'short') ?
				responseSellForLong : responseSellForShort;

		responseSell.forEach((data: any) => {
			const order = JSON.parse(JSON.stringify(data.order))

			const takerAmount = BigNumber.from(order.takerAmount) // collateral token
			const makerAmount = BigNumber.from(order.makerAmount) // position token
			const remainingFillableTakerAmount =
				data.metaData.remainingFillableTakerAmount

			if (BigNumber.from(remainingFillableTakerAmount).gt(0)) {
				// TODO Consider moving the expectedRate calcs inside get0xOpenOrders
				order['expectedRate'] = takerAmount
					.mul(collateralTokenUnit)
					.div(makerAmount).toString()
				order['remainingFillableTakerAmount'] = remainingFillableTakerAmount
				orders.push(order)
			}
		})

		// @todo Not needed in my opinion as we calculate it in the useEffect of the average price calcs
		// if (orders.length > 0) {
		// 	const bestRate = orders[0].expectedRate
		// 	setAvgExpectedRate(bestRate)
		// }
		return orders
	}

	useEffect(() => {
		// Abort if the user is not connected to the right chain
		if (activeChainId !== AppConfig.chainId) {
			return
		}
		// Calculate average price
		if (userInputValue.gt(0)) {
			if (
				parseUnits(userInputValue.toString(), decimals).gt(0) &&
				existingSellLimitOrders.length > 0
			) {
				// If user has entered an input into the Amount field and there are existing SELL LIMIT orders to fill in the orderbook...

				// User input (userInputValue) corresponds to the taker token in SELL LIMIT.
				let takerAmountToFill = userInputValue

				let cumulativeAvgRate = ZERO
				let cumulativeTaker = ZERO
				let cumulativeMaker = ZERO

				// @todo calculate max bettable amount / takerFillAmount

				// Calculate average price. Note that if userInputValue exceeds the amount in the orderbook,
				// existing orders will be cleared and a portion will remain unfilled.
				// @todo Consider showing a message to user when desired buy amount exceeds the available amount in the orderbook.
				existingSellLimitOrders.forEach((order: any) => {
					// Loop through each SELL LIMIT order where makerToken = position token and takerToken = collateral token

					let takerAmount = BigNumber.from(order.takerAmount)
					let makerAmount = BigNumber.from(order.makerAmount)
					const remainingFillableTakerAmount = BigNumber.from(
						order.remainingFillableTakerAmount
					)
					const expectedRate = BigNumber.from(order.expectedRate)

					// If order is already partially filled, set takerAmount equal to remainingFillableTakerAmount and makerAmount to the corresponding pro-rata fillable makerAmount
					if (remainingFillableTakerAmount.lt(takerAmount)) {
						// Existing SELL LIMIT order was already partially filled

						// Overwrite takerAmount and makerAmount with remaining amounts
						takerAmount = remainingFillableTakerAmount
						makerAmount = remainingFillableTakerAmount
							.mul(collateralTokenUnit) // scaling for high precision integer math
							.div(expectedRate)
					}

					// If there are remaining userInputValue (takerAmountToFill), then check whether the current order under consideration will be fully filled or only partially
					if (takerAmountToFill.gt(0)) {
						if (takerAmountToFill.lt(takerAmount)) {
							const makerAmountToFill = takerAmountToFill
								.mul(collateralTokenUnit)
								.div(expectedRate)
							cumulativeMaker = cumulativeMaker.add(makerAmountToFill)
							cumulativeTaker = cumulativeTaker.add(takerAmountToFill)
							takerAmountToFill = ZERO // With that, it will not enter this if block again
						} else {
							cumulativeTaker = cumulativeTaker.add(takerAmount)
							cumulativeMaker = cumulativeMaker.add(makerAmount)
							takerAmountToFill = takerAmountToFill.sub(takerAmount)
						}
					}
				})

				// Calculate average price to pay, before 1% fee
				cumulativeAvgRate = cumulativeTaker
					.mul(collateralTokenUnit) // scaling for high precision integer math
					.div(cumulativeMaker)

				// To be paid in taker token, which corresponds to the collateral token here
				const feeAmount = cumulativeTaker
					.mul(parseUnits(TRADING_FEE.toString(), decimals))
					.div(collateralTokenUnit)
					
				const cumulativeAvgRateNetOfFees = (cumulativeTaker.sub(feeAmount))
					.mul(collateralTokenUnit) // scaling for high precision integer math
					.div(cumulativeMaker)

				setAvgExpectedRate({gross: cumulativeAvgRate, net: cumulativeAvgRateNetOfFees})
				setFeeAmount(feeAmount)

				// @todo Needed?
				// if (cumulativeAvgRate.gt(0)) {
				// 	setAvgExpectedRate(cumulativeAvgRate)
				// 	// Amount that the buyer/user has to pay excluding fee.
				// 	// const youPay = cumulativeTaker
				// 	// setYouPay(youPay)

				// 	// Calculate fee amount (to be paid in collateral token), based on to be tradeable amount only
					
				// 	setFeeAmount(feeAmount)

				// 	setAvgExpectedRateNetOfFees()
				// }
			} else {
				if (parseUnits(userInputValue.toString(), decimals).eq(0)) {
					// @todo a similar part is also included in getSellLimitOrders
					if (existingSellLimitOrders.length > 0) {
						setAvgExpectedRate({
							gross: BigNumber.from(existingSellLimitOrders[0].expectedRate),
							net: BigNumber.from(existingSellLimitOrders[0].expectedRate).mul(parseUnits(collateralTokenUnit.sub(TRADING_FEE).toString(), decimals)).div(collateralTokenUnit)})
					}
				}
			//   setOrderBtnDisabled(true)
			}
		}
	// }
	}, [userInputValue])

	const handleOrderSubmit = async () => {
		setTransactionProcess(true)
		const provider = await wallets[0]?.getEthersProvider()
		// console.log("existingSellLimitOrders", existingSellLimitOrders) // @todo check whether this is updated when new sell limit orders are posted via DIVA App
		const orderData = {
			signer: provider.getSigner(), // @todo Could I also pass in wallet here because it's doing const signer = orderData.provider.getSigner() in fillLimitOrders.ts?
			takerAssetFillAmount: userInputValue,
			collateralDecimals: decimals,
			existingLimitOrders: existingSellLimitOrders,
			chainId: AppConfig.chainId,
		}

		fillLimitOrders(orderData)
			.then(async (orderFillStatus: any) => {
				if (!(orderFillStatus === undefined)) {
					// On fill order success ...

					// Wait for 4 secs for subgraph to update
					await new Promise((resolve) => setTimeout(resolve, 4000))

					setTransactionProcess(false)
					setTransactionStatus({ success: true, hash: orderFillStatus.hash });

					// setTimeout(() => {
					// 	close()
					// }, 10000)
				} else {
					// @todo Check if this if block is needed. Tx rejection by user is handled within fillLimitOrders already
					// Rejected by user or tx failure (i.e., orderFillStatus == undefined as no tx receipt was returned)
					// Do not reset values.
					// setFillLoading(false)
					// alert('Order could not be filled.')
					setFailed(true)
					setTransactionProcess(false)
				}
			})
			.catch((error) => {
				console.error(error)
				setFailed(true)
				setTransactionProcess(false)
			})
	}

	// Function to handle retry via the "Try again" button in the `TransactionFailure` component if user rejects transaction or it fails
	const handleRetry = async () => {
		setFailed(false); // Reset the failed state
		handleOrderSubmit(); // Retry the order submission
	};

	// @todo If the user doesn't have any USDC/dUSD, then there should be a message that he cannot buy (or disable the Predict button)

	useEffect(() => {
        if (activeChainId !== AppConfig.chainId) {
            return
        }
        checkAllowanceDebounced();
    }, [wallet, userInputValue, checkAllowanceDebounced, activeChainId]);

	useEffect(() => {
		// @todo I don't think I need it here as loading the orders is independent of network
		// if (activeChainId !== SupportedChainId.POLYGON) {
		// 	return
		// }
		getSellLimitOrders().then((orders) => {
			setExistingSellLimitOrders(orders)
		})
	}, [activeChainId])

	const handleApprove = async () => {
		setIsLoading(true)
		const amountToApprove = userInputValue.add(
			BigNumber.from(100)
		)
		// Added small buffer to handle potential rounding issues
		const userAddress = wallet?.address
		const approveResponse = await approve(
			amountToApprove,
			tokenContract, // collateral token
			exchangeProxy,
			userAddress
		)

		// Wait for a second to ensure that approveResponse !== undefined so that the `checkAllowance` function can be executed.
		// It happened that after Approve, the button label didn't update. I think the problem is here, but not 100% sure.
		// @todo investigate.
		await new Promise(resolve => setTimeout(resolve, 1000));

		setIsLoading(false)

		if (approveResponse !== undefined) {
			checkAllowance()
		}
	}
	
	const userInputNumber = Number(formatUnits(userInputValue, decimals));

	const buttonText = wallet?.address
    ? isApproved()
        ? userInputNumber > Number(balance)
            ? 'Insufficient Balance'
            : userInputNumber < 0
				? 'Enter positive amount'
				: 'Predict'
        : 'Set Trade Limit'
    : 'Connect Wallet';

	const buttonOnClick = wallet?.address
		? isApproved()
			? handleOrderSubmit
			: handleApprove
		: login


	// @todo could display a message to the user to provide him with more information why
	// the button was disabled
	const buttonDisabled = 
		isLoading ||
		(!wallet?.address) ||
		(wallet?.address && isApproved() && (userInputNumber > Number(balance))) ||
		userInputValue.eq(0) || userInputNumber < 0;

	// @todo Not needed as this is calculate based on the actual tradeable amount within the corresponding useEffect block
	// const feeAmount = userInputValue
	// 	.mul(parseUnits(TRADING_FEE.toString(), decimals))
	// 	.div(collateralTokenUnit);

	// @todo Move this into a lib as it's being used in SellOrderModal as well
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

	return (
		<>
			<Modal close={close}>
			{wallet?.address ? ( // Start of ternary expression
			<>
				<div className="flex gap-1 items-center">
					<Image src="/images/predict.png" alt="predict" width={40} height={40} className="w-4" />
					<h2 className="text-lg">
						Predict {predictionData === 'Yes' ? 'YES' : 'NO'}
					</h2>
				</div>
				{activeChainId !== AppConfig.chainId ? ( // Nested ternary expression
					<div className='flex justify-center items-center text-gray-600 mt-6 mb-6'>
						<p>Please <a href="#" className="text-blue-500 cursor-pointer" onClick={(event) => {
							event.preventDefault();
							switchNetwork();
						}}>switch</a> to the Polygon network.</p>
					</div>
				) : ( // Else part of th nested ternary expression
				<div className="relative flex flex-col items-center mt-6">
					<div className="rounded-lg bg-gray-100 w-full p-4 flex justify-between items-center gap-2">
						<div className="flex flex-col">
							<span className="text-gray-500 text-sm">You pay</span>
							<input
								className="text-2xl font-semibold border-none bg-transparent w-[100px]"
								defaultValue={0}
								type="number"
								min="0"
								onChange={(e) => {
									const value = Number(e.target.value);
									setUserInputValue(parseUnits(value.toString(), decimals));
								}}
							/>
						</div>
						<div className="flex flex-col gap-1">
							<span className="flex gap-1 items-center justify-end">
							<Link href={`${AppConfig.blockExplorerURL}/token/${pool?.collateralToken.id}`} className="text-blue-500" target="_blank" rel="noopener noreferrer">
								<Image
									src={collateralTokenIcon}
									alt="collateralTokenIcon"
									width={40}
    								height={40}
									className="w-15 h-15"
								/>
							</Link>
								<h4>{collateralTokenDisplayName}</h4>
							</span>
						</div>
					</div>

					<div className="stats bg-transparent justify-end text-right w-full">
						<div className="stat pr-0">
							<div className="stat-desc text-sm">Balance: <span className="stat-value text-sm">{`${toExponentialOrNumber(
								Number(balance), 2, 2)} ${collateralTokenDisplayName}`}</span></div>
						</div>
					</div>

					<button
						type="button"
						className={`h-[48px] px-6 flex justify-center items-center font-semibold w-full rounded-lg 
                			${buttonDisabled ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-[#0085be] text-white'}`}
						disabled={buttonDisabled}
						onClick={buttonOnClick}>
						{isLoading ? (
							<span className="loading loading-spinner loading-md"></span>
						) : (
							buttonText
						)}
					</button>

					<div className={'relative w-full flex flex-col gap-2 h-full'}>
						<button
							className="p-2 flex justify-end items-center text-white rounded-lg gap-1 !text-[#9CA3AF] font-semibold"
							onClick={() => setShowSummary((prev) => !prev)}>
							Summary
							{!showSummary ? (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 16 16"
									fill="none">
									<path
										fillRule="evenodd"
										clipRule="evenodd"
										d="M3.50011 4.68933L8.00011 9.18933L12.5001 4.68933L13.5608 5.74999L8.00011 11.3107L2.43945 5.74999L3.50011 4.68933Z"
										fill="#9CA3AF"
									/>
								</svg>
							) : (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 16 16"
									fill="none">
									<path
										fillRule="evenodd"
										clipRule="evenodd"
										d="M8.00011 4.68933L13.5608 10.25L12.5001 11.3107L8.00011 6.81065L3.50011 11.3107L2.43945 10.25L8.00011 4.68933Z"
										fill="#9CA3AF"
									/>
								</svg>
							)}
						</button>
						{showSummary && (
							<div className="rounded-lg bg-white w-full p-4 flex justify-between items-center gap-2">
								<div className="flex flex-col gap-1 text-left">
									<h3 className="text-gray-400 text-sm font-semibold">
										Fee
									</h3>
									<h3 className="text-gray-400 text-sm font-semibold">
										Effective Rate
									</h3>
								</div>
								<div className="text-right flex flex-col gap-1">
									<h3 className="text-gray-400 text-sm font-semibold">
										${toExponentialOrNumber(Number(formatUnits(feeAmount, decimals)), 2, 2)}
									</h3>
									<h3 className="text-sm font-semibold text-gray-400">
										{(Number(formatUnits(avgExpectedRate.net, decimals)) * 100).toFixed(2)}%
									</h3>
								</div>
							</div>
						)}
					</div>
				</div>
				)}
			</>
			) : ( // Else part of the ternary expression
					<div className='flex justify-center items-center text-gray-600 mt-6 mb-6'>
						<p>Please <a href="#" className="text-blue-500 cursor-pointer" onClick={(event) => {
							event.preventDefault();
							login();
						}}>connect wallet</a> to continue.</p>
					</div>
				)
			}
			</Modal>
			
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
		</>
	)
}
