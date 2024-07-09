import { BigNumber, ethers } from 'ethers'
import * as zeroXContractAddresses from '@0x/contract-addresses'
import ZEROX_ABI from '../abi/IZeroX.json'
import { parseUnits } from 'ethers/lib/utils'

// Trading fee recipient
// @todo Not used yet anywhere -> Shall we only consider orders with a pre-defined trading fee recipient?
// @todo move to config if you consider keeping it
// export const TRADING_FEE_RECIPIENT =
//     '0x1062CCC9F9a4bBcf565799683b6c00eA525ECb9F'

// Trading fee; 0.01 corresponds to 1%
export const TRADING_FEE = 0.01 // @todo maybe better to read it from the orders directly? What if orders with too high fees exist? -> They should be filtered out

export const fillLimitOrders = async (orderData: any) => { // @todo add proper type
    // Connect to 0x exchange contract
    const address = zeroXContractAddresses.getContractAddressesForChainOrThrow(orderData.chainId);
    const exchangeProxyAddress = address.exchangeProxy;
    const exchange = new ethers.Contract(exchangeProxyAddress, ZEROX_ABI, orderData.signer);

    // Define variables for integer math
    const decimals = orderData.collateralDecimals;
    const collateralTokenUnit = parseUnits('1', decimals);

    // Calculate trading fee amount paid by the taker in taker token during fill
    const feeAmount = orderData.takerAssetFillAmount
        .mul(parseUnits(TRADING_FEE.toString(), decimals))
        .div(collateralTokenUnit);

    const takerAssetFillAmountNetOfFee = orderData.takerAssetFillAmount.sub(feeAmount);

    // @todo add proper types
    let ordersToFill: any[] = [];
    let takerAssetFillAmounts: any[] = [];
    let signatures: any[] = [];
    let remainingTakerAssetFillAmount = takerAssetFillAmountNetOfFee;

    // Note that limit orders are already sorted by best price
    orderData.existingLimitOrders.forEach((order: any) => { // @todo add proper type
        let _takerAssetFillAmount;

        if (remainingTakerAssetFillAmount.gt(10)) {
            if (remainingTakerAssetFillAmount.lte(order.remainingFillableTakerAmount)) {
                _takerAssetFillAmount = remainingTakerAssetFillAmount.toString();
            } else {
                _takerAssetFillAmount = order.remainingFillableTakerAmount;
            }
    
            ordersToFill.push(order);
            takerAssetFillAmounts.push(BigNumber.from(_takerAssetFillAmount).sub(BigNumber.from(10)).toString());
            signatures.push(order.signature);
            remainingTakerAssetFillAmount = remainingTakerAssetFillAmount.sub(_takerAssetFillAmount);
        }
    });

    if (ordersToFill.length > 0) {
        try {
            const response = await exchange.batchFillLimitOrders(
                ordersToFill,
                signatures,
                takerAssetFillAmounts,
                true
            );
            await response.wait();
            return response;
        } catch (err) {
            console.error('Error executing batchFillLimitOrders: ' + JSON.stringify(err));

            // Handle user rejection in wallet
            if ((err as any).code === 'ACTION_REJECTED') {
                throw new Error('Transaction rejected by user');
            }            
            return err;
        }
    } else {
        console.log("No orders to fill or remaining fill amount is too low.");
        return null;
    }
};

// @todo switch to ethers lib
export const approve = async (amount: any, tokenContract: any, spender: any, owner: any) => { // @todo add proper types
    try {
        const approveResponse = await tokenContract.methods
            .approve(spender, amount)
            .send({ from: owner })
        if ('events' in approveResponse) {
            // Check allowance amount in events to avoid another contract call
            return approveResponse.events.Approval.returnValues.value
        } else {
            // In case the approve call does not or delay emit events, read the allowance again
            await new Promise((resolve) => setTimeout(resolve, 4000))

            // Set allowance for collateral token (<= 18 decimals)
            const allowance = await tokenContract.methods
                .allowance(owner, spender)
                .call()
            return allowance
        }
    } catch (error) {
        // If rejected by user in Metamask pop-up
        console.error('error ' + JSON.stringify(error))
        return 'undefined'
    }
}

