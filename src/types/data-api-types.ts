export type ApiData = {
	parcl_id: number
	limit: number
	offset: number
	total: number
	previous: any
	next: string
	name: string
	location_type: string
	currency: string
	metric: string
	price_feed: priceFeed[]
}

type priceFeed = {
	date: string
	price: number
}
