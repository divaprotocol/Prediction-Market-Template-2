import React from 'react'
import { Modal } from './Modal'

export const TransactionInProcess = ({ close }: { close: () => void }) => {
	return (
		<Modal close={close}>
			<div className="flex flex-col items-center gap-6 text-center mt-2">
				<h2 className="text-2xl text-gray-700">Sending Transaction</h2>
				<span className="loading loading-spinner loading-lg"></span>
				<h2>
					Proceed in your wallet <br />
					to complete transaction
				</h2>
			</div>
		</Modal>
	)
}
