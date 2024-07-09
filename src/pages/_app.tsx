import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import '@rainbow-me/rainbowkit/styles.css'
import { Inter } from 'next/font/google'
import { PrivyProvider } from '@privy-io/react-auth'
import { useEffect } from 'react'
import { ChainChecker } from '@/components/common/ChainChecker'
import Cookies from 'universal-cookie'
import { polygon } from 'wagmi/chains' // @todo load this based on config file provided by user
import { QueryClient, QueryClientProvider } from 'react-query'
import { useState } from 'react'
import TransactionContext from '@/components/context/TransactionContext'

const inter = Inter({ subsets: ['latin'] })

const queryClient = new QueryClient()

export default function App({ Component, pageProps }: AppProps) {
	// console.log("Rendering App")
	const cookie = new Cookies()
	const [transactionStatus, setTransactionStatus] = useState<{ success?: boolean; hash?: string } | null>(null);

	useEffect(() => {
		console.log(cookie.get('privy-refresh-token'), 'privy-refresh-token')

		if (performance.navigation.type == performance.navigation.TYPE_RELOAD) {
			console.info('This page is reloaded')
		} else {
			console.info('This page is not reloaded')
		}
	})

	// @todo Check whether user is logged into their wallet. If no, show a message

	return (
		// About Privy configuration: https://docs.privy.io/guide/react/configuration/networks#configuration
		<PrivyProvider
			appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
			config={{
				loginMethods: ['wallet'],
				defaultChain: polygon,
				supportedChains: [polygon],
			}}
			onSuccess={(user) => console.log(`User ${user.id} logged in!`)}>
			<QueryClientProvider client={queryClient}>
				<main className={inter.className}>
					<TransactionContext.Provider value={{ transactionStatus, setTransactionStatus }}>
						<Component {...pageProps} />
					</TransactionContext.Provider>
				</main>
			</QueryClientProvider>
		</PrivyProvider>
	)
}
