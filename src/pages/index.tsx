import { Inter } from 'next/font/google'
import { Layout } from '@/components/Layout'
import { HomePage } from '@/components/Home'
import { GetServerSideProps } from 'next'
import { fetchPool, ORDER_TYPE } from '@/utils/fetchPool'
import { AppConfig } from '@/config'
import { fetch0xOrderbook } from '../utils/fetch0xOrderbook'

const inter = Inter({ subsets: ['latin'] })

// Entry point of the application. When users navigate to the base URL, Next.js will
// automatically render the component exported inside `index.tsx`.
// The data object is a prop that is being passed to the Home component. This data is
// the result of the getServerSideProps function that is executed on the server-side
// during the page rendering process. The getServerSideProps function fetches data asynchronously
// before the page is rendered, and the resulting data is passed to the page component as props.
export default function Home({ data }: { data: any }) {
	console.log("Rendering Home")
	return (
		<Layout>
			<HomePage data={data} />
		</Layout>
	)
}

export const getServerSideProps: GetServerSideProps = async () => {
	try {
		// polygon data will be null as we don't have a poolId for it
		const poolData = await fetchPool(
			AppConfig.graphUrl,
			AppConfig.poolId
		)

		const orderInfo = async () => {
			const longTokenAddress = poolData?.longToken.id
			const shortTokenAddress = poolData?.shortToken.id

			let longTokenInfo
			let shortTokenInfo

			if (!poolData || !longTokenAddress || !shortTokenAddress) {
				console.error('No pool data available');
				return { props: { errorMessage: 'No pool data available' } };
			} else {
				longTokenInfo = await fetch0xOrderbook(
					poolData,
					longTokenAddress,
					AppConfig.chainId
				)
				shortTokenInfo = await fetch0xOrderbook(
					poolData,
					shortTokenAddress,
					AppConfig.chainId
				)
			}

			return {
				longTokenInfo,
				shortTokenInfo,
			}
		}

		// @todo rename to remove reference to chain
		const orderInfoSupportedChain = await orderInfo()

		// @todo Consider removing the key property at a later stage
		const data = {
			[AppConfig.chainId]: {
				poolData: poolData,
				orderInfo: orderInfoSupportedChain,
			}
		}

		return { props: { data } }
	} catch (error) {
		console.error('Error fetching pool data:', error)
		// Send a user-friendly message or error code to the frontend
		return { props: { errorMessage: 'Failed to load data.' } };
	}
}

// export async function getServerSideProps() {
//   const options = {
//     method: "GET",
//     headers: {
//       accept: "application/json",
//       Authorization: "0e5e97e6dbd00c063be91d67759d2d02664788949bd4d814ee",
//     },
//   };
//   // Fetch data from external API
//   const res = await fetch(
//     "https://api.realestate.parcllabs.com/v1/price_feed/2900187/history?order=desc&offset=0&limit=30",
//     options
//   );

//   const data = await res.json();
//   console.log(data, "dataa");

//   // Pass data to the page via props
//   return { props: { data } };
// }
