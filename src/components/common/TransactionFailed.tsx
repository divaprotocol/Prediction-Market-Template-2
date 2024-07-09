import React from "react";
import { Modal } from "./Modal";

export const TransactionFailed = ({ close, retry }: { close: () => void, retry: () => void }) => {
  return (
    <Modal close={close}>
      <div className="flex flex-col items-center gap-6 text-center mt-2">
        <h2 className="text-2xl text-gray-700">Transaction Failed</h2>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="100"
          height="100"
          viewBox="0 0 100 100"
          fill="none"
        >
          <path
            d="M50.0001 54.1669V37.2419M50.0001 66.6669V66.6627M55.1501 17.7169C53.5218 17.0228 51.7701 16.665 50.0001 16.665C48.2301 16.665 46.4783 17.0228 44.8501 17.7169C35.0334 21.8961 11.8334 58.9669 12.5167 68.8794C12.7792 72.7627 14.7042 76.3377 17.7876 78.6711C25.9834 84.8877 74.0167 84.8877 82.2126 78.6711C83.7387 77.5093 84.9986 76.0345 85.9077 74.3457C86.8168 72.6568 87.354 70.793 87.4834 68.8794C88.1667 58.9711 64.9667 21.8961 55.1501 17.7169Z"
            stroke="#E53E3E"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h2>
          Something went wrong <br />
          please try again
        </h2>
        <button 
          className="flex justify-center items-center px-6 h-[48px] rounded-md border-[0.5px] border-solid border-blue-500 text-blue-500 w-[90%]"
          onClick={retry}
        >
          Try again
        </button>
      </div>
    </Modal>
  );
};
