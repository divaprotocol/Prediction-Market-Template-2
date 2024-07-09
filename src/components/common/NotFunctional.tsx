import React from "react";
import { Modal } from "./Modal";
import { twMerge } from "tailwind-merge";

export const NotFunctional = ({ close }: { close: () => void }) => {
  return (
    <Modal>
      <div className="flex flex-col items-center gap-6 text-center mt-2">
        <h2 className="text-2xl text-gray-700 flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22ZM11 11V17H13V11H11ZM11 7V9H13V7H11Z"
              fill="#718096"
            />
          </svg>
          Note
        </h2>
        <p className="">
          ShortX does currently not implement a sell feature. You will be
          redirected to the DIVA App for advanced trading options.
        </p>

        <button
          className={twMerge(
            "w-[90%] flex justify-center items-center h-[48px] rounded px-3 text-sm gap-2 border-[0.5px] border-primary shadow-sm md:px-6 md:text-lg md:shadow-md md:rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold"
          )}
        >
          Go to DIVA App
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M11.8047 4.19526C12.0651 4.45561 12.0651 4.87772 11.8047 5.13807L5.13807 11.8047C4.87772 12.0651 4.45561 12.0651 4.19526 11.8047C3.93491 11.5444 3.93491 11.1223 4.19526 10.8619L10.8619 4.19526C11.1223 3.93491 11.5444 3.93491 11.8047 4.19526Z"
              fill="white"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M4 4.66667C4 4.29848 4.29848 4 4.66667 4H11.3333C11.7015 4 12 4.29848 12 4.66667V11.3333C12 11.7015 11.7015 12 11.3333 12C10.9651 12 10.6667 11.7015 10.6667 11.3333V5.33333H4.66667C4.29848 5.33333 4 5.03486 4 4.66667Z"
              fill="white"
            />
          </svg>
        </button>
        <button
          className="flex justify-center items-center px-6 h-[48px] rounded-md border-[0.5px] border-solid border-blue-500 text-blue-500 w-[90%] font-semibold"
          onClick={close}
        >
          No Thanks
        </button>
      </div>
    </Modal>
  );
};
