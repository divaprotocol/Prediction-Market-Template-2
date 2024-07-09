/* eslint-disable react/no-unescaped-entities */
import Link from 'next/link'
import Image from "next/image";
import { useState } from 'react'
import { AppConfig } from '@/config'

export const AboutMarket = () => {
	// console.log("Rendering AboutMarket")
	const [showMoreText, setShowMoreText] = useState(false)

	const trimText = (text: string, length: number) => {
		if (text.length <= length) {
			return text
		}

		return (
			<>
				{text.slice(0, length)}
				...
				<span
					className="text-blue-500 cursor-pointer"
					onClick={() => setShowMoreText(true)}>
					read more
				</span>
			</>
		)
	}

	const resolutionSource = AppConfig.resolutionSource;

	return (
		<div className="w-full flex flex-col justify-center items-start gap-2 p-4 lg:w-[840px] rounded-2xl border-[1px] border-solid border-gray-200 bg-white">
			<h2 className="text-lg font-semibold">About this market</h2>
			<p>
				{showMoreText
					? AppConfig.aboutMarketDescription
					: trimText(AppConfig.aboutMarketDescription, 500)}
			</p>
			{resolutionSource && (
                <Link href={resolutionSource} target="_blank" rel="noopener noreferrer" className="flex gap-1 items-center text-blue-500">
                    See resolution source
                    <Image src="/images/right.png" width={40} height={40} alt="right" className="w-6" />
                </Link>
            )}
		</div>
	)
}
