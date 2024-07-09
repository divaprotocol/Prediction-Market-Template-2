import { queryPool } from '@/lib/queries'
import { Pool } from '@/types/diva-subgraph-types'
import request from 'graphql-request'


// this function will move to dedicated file
export async function fetchPool(
    graphUrl: string,
    poolId: string
): Promise<Pool | undefined> {
    try {
        const poolQuery = queryPool(poolId)
        const res = await request<{ pool: Pool }>(
            graphUrl,
            poolQuery.query,
            poolQuery.variables
        )
        return res.pool
    } catch (err) {
        console.error('Failed to fetch pool', err)
        // handle the error further here, or throw it to be handled by the calling code
    }
}

// @todo move somewhere else
export const ORDER_TYPE = {
    BUY: 0,
    SELL: 1,
}