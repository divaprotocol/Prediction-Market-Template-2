import { twMerge } from 'tailwind-merge'

interface PredictionBoxProp {
	background: string
	up: string
	down: string
	setShowPredictModal: () => void
	setPredictionData: () => void
}
export const PredictionBox = ({
	background,
	up,
	down,
	setShowPredictModal,
	setPredictionData,
}: PredictionBoxProp) => {
	// console.log("Rendering PredictionBox")
	return (
		<button
			className={twMerge(
				'flex flex-col gap-2 rounded-xl p-4 items-center md:flex-row',
				background
			)}
			onClick={() => {
				setShowPredictModal()
				setPredictionData()
			}}>
			<h3 className="font-bold">{up}</h3>
			<h4 className="text-xs">{down}</h4>
		</button>
	)
}
