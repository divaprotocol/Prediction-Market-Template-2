export type Config = {
    chainId: number; // chainId of the network (e.g., 1 for Ethereum, 137 for Polygon, etc.)
    graphUrl: string; // URL of the DIVA Protocol / 0x graphql endpoint for the specified network
    poolId: string; // Id of the DIVA Protocol pool associated with the prediction market in the app
    webSocket: string; // Websocket endpoint for 0x orderbook
    order: string; // API endpoint for 0x orderbook
    diva: string; // Address of the DIVA Protocol contract on the specified network
    blockExplorerURL: string; // URL of the block explorer for the specified network
    resolutionSource: string; // URL of the data source for the resolution of the market
    XURL: string; // URL of the Twitter/X account
    AnnouncementURL: string; // URL of the announcement (optional)
    homeImagePath: string; // Path to the home image in the public folder (e.g., '/home.png')
    collateralTokenIconPath: string; // Path to the collateral token icon in the public folder (e.g., '/images/USDC.png')
    collateralTokenDisplayName: string; // Display name of the collateral token in the app
    websiteLogo: string; // Path to the logo in the public folder (e.g., '/logoshortx.svg')
    yesOutcomeToken: 'long' | 'short'; // Indicates which token, long or short, is associated with the YES outcome of the market
    enableSell: boolean; // Indicates if the sell button in `UserPredictions.tsx`, and with that the sell functionality, should be enabled
    aboutMarketDescription: string; // Description of the market, displayed in the About section
};

export const AppConfig: Config = {
    chainId: 137, // Polygon
    graphUrl: 'https://api.studio.thegraph.com/query/73880/diva-protocol-v1-polygon/version/latest', // picking the latest version: replace "latest" with version number if you want to use a specific version of the subgraph
    // poolId: '0x63c379f477ec500b049d0f33d1309b89b449c48a0fa75a217d56e194a5e473cf', // real pool using (native) USDC on Polygon
    // poolId: '0x26a3ea71acbffa9bb6cbdba8264c25675033b6316b855e1e4c5a0d42dc115c45', // test pool using dUSD
    // poolId: '0xb2b692fc8b77223fb5acfff222dda250273570f30d0f629e81ba83ff60476b40', // test pool using dUSD
    // poolId: '0x4ad544275724441cef560cd8cc2ab87f8c39b4677b5f4d98752ad5b03beb7993', // test pool using dUSD
    // poolId: '0xb8abb13ca6459868c4e9db7876d6b463961d2e14e882a1fede1ad0d9b298edd7', // test pool using dUSD
    // poolId: '0xdd864e63009d1448c239f13feb9ef43afc942ebca4b2ef9bbdc5e6d5e5c011cd', // test pool using dUSD
    poolId: '0x645bbe290d9bebcb222425b4c24f545540d8ed107e61861a5f2cff6ebd98a242', // test pool using dUSD
    webSocket: 'wss://polygon.eip712api.xyz/websocket', // websocket endpoint for 0x orderbook
    order: 'https://polygon.eip712api.xyz/0x/orderbook/v1', // api endpoint for 0x orderbook
    diva: '0x2C9c47E7d254e493f02acfB410864b9a86c28e1D', // DIVA Protocol address
    blockExplorerURL: 'https://polygonscan.com', // @todo load via wagmi/privy later on so the user doesn't need to provide this input manually
    resolutionSource: 'https://tellor.io/', // Link to additional information about the data source. Leave empty if you don't have any.
    XURL: 'https://x.com/divaprotocol_io', // Twitter/X url link. Leave empty if you don't have any.
    AnnouncementURL: 'https://www.divaprotocol.io/', // Announcement link. Leave empty if you don't have any.
    homeImagePath: '/home.png', // background image in HomeBanner
    collateralTokenIconPath: '/images/USDC.png', // collateral token icon (e.g., USDC) in Predict and Sell modal
    collateralTokenDisplayName: 'USDC', // Token name to display in the app
    websiteLogo: '/logoshortx.svg', // Logo in the header
    yesOutcomeToken: 'short', // or 'long', depending on the market setup
    enableSell: true,
    aboutMarketDescription: `In the year 2050, Miami finds itself grappling with the ominous reality of being submerged beneath rising sea levels. The once vibrant coastal city, renowned for its stunning beaches and lively atmosphere, now faces the dire consequences of climate change. As a result of melting ice caps and warming oceans, sea levels have surged, causing extensive flooding throughout Miami. Iconic landmarks like Ocean Drive and South Beach are now submerged, and the city's intricate network of canals struggles to manage the relentless influx of seawater. Residents have been forced to adapt to a new normal, with elevated walkways and floating structures becoming a common sight in this aquatic landscape being submerged beneath rising sea levels. The market will be evaluated based on whether the price per square meter in Miami falls below $100.`,
}

