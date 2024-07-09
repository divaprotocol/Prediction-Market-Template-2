import gql from 'graphql-tag'

export const queryPool = (poolId: string) => {
    return {
        query: gql`
        query Pool($poolId: String!) {
          pool(id: $poolId) {
            id
            referenceAsset
            floor
            inflection
            cap
            supplyShort
            supplyLong
            collateralToken {
              id
              name
              decimals
              symbol
            }
            collateralBalanceGross
            gradient
            collateralBalance
            shortToken {
              id
              name
              symbol
              decimals
              owner
            }
            longToken {
              id
              name
              symbol
              decimals
              owner
            }
            finalReferenceValue
            statusFinalReferenceValue
            payoutLong
            payoutShort
            statusTimestamp
            dataProvider
            protocolFee
            settlementFee
            createdBy
            createdAt
            submissionPeriod
            challengePeriod
            reviewPeriod
            fallbackSubmissionPeriod
            permissionedERC721Token
            capacity
            expiryTime
            challenges {
              challengedBy
              proposedFinalReferenceValue
            }
          }
        }
      `,
        variables: { poolId },
    }
}