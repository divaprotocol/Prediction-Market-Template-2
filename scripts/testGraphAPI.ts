// To execute the script, run `npx ts-node --project tsconfig.scripts.json scripts/testGraphAPI.ts` in the terminal

import { GraphQLClient, gql } from 'graphql-request';

// Graph API URL
const endpoint: string = 'https://api.studio.thegraph.com/query/73880/diva-protocol-v1-polygon/version/latest';

// Create a GraphQL client instance to send requests
const client = new GraphQLClient(endpoint);


// GraphQL query, defined with gql for template literal tag
const queryZeroXTakerFills = (address: string, takerToken: string) => gql`
{
    nativeOrderFills(
        where: { taker: "${address}", takerToken: "${takerToken}" }
    ) {
        id
        orderHash
        maker
        taker
        makerToken
        takerToken
        makerTokenFilledAmount
        takerTokenFilledAmount
        takerTokenFeeFilledAmount
        timestamp
    }
}
`

const queryDIVALiquidity = (poolId: string, address: string, eventType: string) => gql`
{
	liquidities(where: {pool: "${poolId}", longTokenHolder: "${address}", eventType: "${eventType}"}) {
        pool {
            id
          }
        eventType
        collateralAmount
        id
        longTokenHolder
        shortTokenHolder
        msgSender
        timestamp
	}
  }
`

async function fetchGraphData(query: string): Promise<void> {
    try {
        const data = await client.request(query);
        console.log(data);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}


// fetchGraphData(
//     queryZeroXTakerFills(
//         "0x9adefeb576dcf52f5220709c1b267d89d5208d78", // taker
//         "0x40cad342a67bf49a2c384203025ad1ebee1e30c5" // takerToken
//     )
// );

fetchGraphData(
    queryDIVALiquidity(
        "0x26a3ea71acbffa9bb6cbdba8264c25675033b6316b855e1e4c5a0d42dc115c45", // poolId
        "0x5c839d242F36f17a8d7988Fea3aEc371Ed436DB9", // longTokenHolder
        "Removed" // eventType
    )
);