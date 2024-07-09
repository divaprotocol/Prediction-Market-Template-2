import { createContext, useEffect, useState } from 'react'
import { AboutMarket } from './AboutMarket'
import { HomeBanner } from './HomeBanner'
import { StatsChart } from './StatsChart'
import { UserPredictions } from './UserPredictions'
import { Pool } from '@/types/diva-subgraph-types'
import { useWallets } from '@privy-io/react-auth'
import { AppConfig } from '@/config'

export const PoolContext = createContext<{
	pool: Pool | null
	chainId: number
	data: any
}>({
	// Set default values
	pool: null,
	chainId: AppConfig.chainId, // taken from config file by default, but will use the actual chainId from the wallet
	data: {}, // @todo specify type of data
})

export const HomePage = ({ data }: { data: any }) => {
	// console.log("Rendering HomePage")
	const { wallets } = useWallets()
	const [pool, setPool] = useState<Pool | null>(null)

	// Read the actual chainId from the wallet
	// const chainId =
	// 	wallets.length > 0
	// 		? Number(wallets[0].chainId.split(':')[1])
	// 		: SupportedChainId.POLYGON
	const activeChainId = wallets.length > 0 ? Number(wallets[0].chainId.split(':')[1]) : 0

	useEffect(() => {
		if (activeChainId === AppConfig.chainId) {
			setPool(data[AppConfig.chainId].poolData)
		} else {
			console.error(`Unsupported chainId: ${activeChainId}`)
		}
	}, [activeChainId, data])

	return (
		<PoolContext.Provider value={{ pool, chainId: AppConfig.chainId, data }}>
			<HomeBanner />
			<div className="flex flex-col items-center mt-12 text-black p-2 gap-12">
				<AboutMarket />
				<StatsChart apiData={data} />
				<UserPredictions />
			</div>
		</PoolContext.Provider>
	)
}
