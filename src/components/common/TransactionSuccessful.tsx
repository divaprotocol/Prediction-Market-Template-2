import React from 'react'
import { Modal } from './Modal'
import Link from 'next/link'
import { AppConfig } from '@/config'
import { useContext } from 'react';
import { PoolContext } from '../Home'

export const TransactionSuccessful = ({ close, transactionHash }: { close: () => void, transactionHash: string }) => {
	const { chainId } = useContext(PoolContext)
	return (
		<Modal close={close}>
			<div className="flex flex-col items-center gap-6 text-center mt-2">
				<h2 className="text-2xl text-gray-700">Transaction Successful</h2>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="100"
					height="100"
					viewBox="0 0 100 100"
					fill="none">
					<path
						d="M35.4167 52.1333L45.1708 61.8792C49.8643 53.6741 56.3595 46.6417 64.1667 41.3125L64.5875 41.025M87.5 50C87.5 54.9246 86.53 59.8009 84.6455 64.3506C82.7609 68.9003 79.9987 73.0343 76.5165 76.5165C73.0343 79.9987 68.9003 82.7609 64.3506 84.6455C59.8009 86.53 54.9246 87.5 50 87.5C45.0754 87.5 40.1991 86.53 35.6494 84.6455C31.0997 82.7609 26.9657 79.9987 23.4835 76.5165C20.0013 73.0343 17.2391 68.9003 15.3545 64.3506C13.47 59.8009 12.5 54.9246 12.5 50C12.5 40.0544 16.4509 30.5161 23.4835 23.4835C30.5161 16.4509 40.0544 12.5 50 12.5C59.9456 12.5 69.4839 16.4509 76.5165 23.4835C83.5491 30.5161 87.5 40.0544 87.5 50Z"
						stroke="#38A169"
						strokeWidth="4"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
				<h2>
					The transaction is completed.
					<br /> Check details on{' '}
					<Link href={`${AppConfig.blockExplorerURL}/tx/${transactionHash}`} className="text-blue-500" target="_blank" rel="noopener noreferrer">
						Explorer
					</Link>
					.
				</h2>
				{/* {(() => {
					console.log("Rendering TransactionSuccessful with close:", close);
					return null; // Return null or any other JSX element
				})()} */}
				<button
					className="flex justify-center items-center px-6 h-[48px] rounded-md border-[0.5px] border-solid border-blue-500 text-blue-500 w-[80%]"
					onClick={close}>
					Done
				</button>
			</div>
		</Modal>
	)
}
