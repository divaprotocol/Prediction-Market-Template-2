import { BigNumber } from "ethers";

export function toExponentialOrNumber(
    number: number,
    expDecimals = 2,
    decDecimals = 4
): string {
    const formattedNumber = number.toString().includes('e')
        ? number.toExponential(expDecimals)
        : number.toFixed(decDecimals)
    return formattedNumber
}

// Simplified function to format the Ethereum address by displaying only the beginning and the end.
export function formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()]; // getMonth() returns month from 0-11.
    const day = date.getDate(); // getDate() returns day of the month from 1-31.
    const year = date.getFullYear(); // getFullYear() returns the year.

    return `${month} ${day}, ${year}`; // Format: Mmm dd, yyyy
}

export const scrollToTop = () => {
    window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'  // Optional: define the scrolling behavior as 'smooth'
    });
}

export function getExpiryMinutesFromNow(Timestamp: number) { // @todo add proper types
    const expiryTime = new Date(Timestamp * 1000)
    const date = new Date()
    const mins = parseInt(((expiryTime.getTime() - date.getTime()) / 1000 / 60).toString())
    return mins
}

export const ZERO = BigNumber.from(0)
