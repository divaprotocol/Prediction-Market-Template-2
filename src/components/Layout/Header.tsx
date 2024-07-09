import { usePrivy, useWallets } from '@privy-io/react-auth'
import Image from 'next/image'
import { useState } from 'react'
import { WalletModal } from '../common/WalletModal'
import { formatAddress } from '../../utils/index'
import { AppConfig } from '@/config'

export const Header = () => {
	const { ready, authenticated, user, logout, connectWallet, login } =
		usePrivy()
	const [showWalletModal, setShowWalletModal] = useState(false)
	const websiteLogo = AppConfig.websiteLogo;

	// Wallet connection
	const { wallets } = useWallets()
	// Select most recently connected wallet: https://docs.privy.io/guide/react/wallets/use-wallets#get-wallet
	const wallet = wallets[0]
	const userAddress = wallet?.address

	const userAddressDisplay = userAddress ? formatAddress(userAddress) : 'No Wallet Connected';

	return (
		<header className="absolute z-[999] w-full h-[64px] bg-[rgba(255,255,255,0.7)] backdrop-blur-4 flex flex-col justify-center md:h-[80px]">
			<div className="flex justify-between lg:justify-around px-4 md:px-20 items-center">
				<Image
					src={websiteLogo}
					alt="logo"
					width={100}
    				height={100}
					className="object-cover h-[40px] md:h-[60px]"
				/>
				{ready && authenticated ? (
					<button
						type="button"
						className="bg-white bg-opacity-80 text-blue-500 flex justify-center items-center h-[32px] rounded-full px-1 text-sm gap-1 border-[0.5px] border-primary shadow-sm md:px-4 md:h-[48px] md:text-lg md:shadow-md md:rounded-full"
						onClick={() => setShowWalletModal(true)}>
						<Image
							src="/images/user.png"
							alt="wallet"
							width={100}
							height={12}
							className="w-4 h-4"
						/>
						{userAddressDisplay}
						{/* {account.displayName}
            {account.displayBalance ? ` (${account.displayBalance})` : ""} */}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="none">
							<path
								fillRule="evenodd"
								clipRule="evenodd"
								d="M3.50011 4.68945L8.00011 9.18945L12.5001 4.68945L13.5608 5.75011L8.00011 11.3108L2.43945 5.75011L3.50011 4.68945Z"
								fill="#3182CE"
							/>
						</svg>
					</button>
				) : (
					<button
						onClick={login}
						className="bg-[#0085be] flex justify-center items-center h-[32px] rounded-full px-3 text-sm gap-2 border-[0.5px] border-primary shadow-sm md:px-6 md:h-[48px] md:text-lg md:shadow-md md:rounded-full">
						{' '}
						<Image
							src="/images/wallet.png"
							alt="wallet"
							width={100}
							height={12}
							className="w-4 h-4"
						/>
						Connect wallet
					</button>
				)}
			</div>
			{showWalletModal && (
				<WalletModal
					close={() => {
						setShowWalletModal(false)
					}}>
					<div className="text-center flex flex-col justif-center items-center">
						<h2 className="font-semibold text-blue-500">
							{userAddressDisplay}
						</h2>
						{/* // QUESTION: how to get the chain name directly? -> const provider = await wallets[0]?.getEthersProvider() -> _network.name */}
						<h4 className="text-sm text-gray-500">{wallet?.chainId === "eip155:137" ? "Polygon" : ""}</h4>
						<button
							className="w-full mt-6 bg-[#0085be] to-blue-600 flex justify-center items-center h-[32px] rounded-full px-3 text-sm gap-2 border-[0.5px] border-primary shadow-sm text-white"
							onClick={() => {
								setShowWalletModal(false)
								logout()
							}}>
							<svg
								fill="none"
								height="16"
								viewBox="0 0 18 16"
								width="18"
								xmlns="http://www.w3.org/2000/svg">
								<title>Disconnect</title>
								<path
									d="M2.67834 15.5908H9.99963C11.5514 15.5908 12.399 14.7432 12.399 13.1777V10.2656H10.6354V12.9863C10.6354 13.5332 10.3688 13.8271 9.78772 13.8271H2.89026C2.3092 13.8271 2.0426 13.5332 2.0426 12.9863V3.15625C2.0426 2.60254 2.3092 2.30859 2.89026 2.30859H9.78772C10.3688 2.30859 10.6354 2.60254 10.6354 3.15625V5.89746H12.399V2.95801C12.399 1.39941 11.5514 0.544922 9.99963 0.544922H2.67834C1.12659 0.544922 0.278931 1.39941 0.278931 2.95801V13.1777C0.278931 14.7432 1.12659 15.5908 2.67834 15.5908ZM7.43616 8.85059H14.0875L15.0924 8.78906L14.566 9.14453L13.6842 9.96484C13.5406 10.1016 13.4586 10.2861 13.4586 10.4844C13.4586 10.8398 13.7321 11.168 14.1217 11.168C14.3199 11.168 14.4635 11.0928 14.6002 10.9561L16.7809 8.68652C16.986 8.48145 17.0543 8.27637 17.0543 8.06445C17.0543 7.85254 16.986 7.64746 16.7809 7.43555L14.6002 5.17285C14.4635 5.03613 14.3199 4.9541 14.1217 4.9541C13.7321 4.9541 13.4586 5.27539 13.4586 5.6377C13.4586 5.83594 13.5406 6.02734 13.6842 6.15723L14.566 6.98438L15.0924 7.33984L14.0875 7.27148H7.43616C7.01917 7.27148 6.65686 7.62012 6.65686 8.06445C6.65686 8.50195 7.01917 8.85059 7.43616 8.85059Z"
									fill="currentColor"></path>
							</svg>
							Disonnect
						</button>
					</div>
				</WalletModal>
			)}
		</header>
	)
}
