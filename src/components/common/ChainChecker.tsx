import React from 'react';
import { useWallets } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import { AppConfig } from '@/config'

export const ChainChecker = ({ children }: { children: React.ReactNode }) => {
    const { wallets } = useWallets();
    const wallet = wallets[0]
    const [isCorrectChain, setIsCorrectChain] = useState(false);

    useEffect(() => {
        const supportedChainId = AppConfig.chainId;

        if (wallets.length > 0) {
            const connectedChainId = parseInt(wallets[0].chainId.split(':')[1]);
            setIsCorrectChain(connectedChainId === supportedChainId);
        }
    }, [wallets]);

    const switchNetwork = async () => {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${AppConfig.chainId.toString(16)}` }],
            });
        } catch (switchError) {
            console.error('Could not switch to the network: ', switchError);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen">
        {isCorrectChain ? (
            children
        ) : (
            <div className="text-black text-xl text-center">
            <p>Please switch to the Polygon network.</p>
            <button className="bg-blue-500 text-white px-4 py-2 rounded-md mt-5" onClick={switchNetwork}>Switch</button>
            </div>
        )}
        </div>
    );
};
