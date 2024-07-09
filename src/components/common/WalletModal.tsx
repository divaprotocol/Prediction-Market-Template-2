import React, { useEffect, useRef } from "react";
import Image from "next/image";

interface ModalProps {
  children: React.ReactNode;
  close?: (value: boolean) => void;
}
export const WalletModal = ({ children, close }: ModalProps) => {
  const modalRef: any = useRef();

  useEffect(() => {
    let handler = (e: { target: any }) => {
      if (!modalRef.current.contains(e.target)) {
        close && close(false);
      }
    };

    document.addEventListener("mousedown", handler);

    return () => {
      document.removeEventListener("mousedown", handler);
    };
  });

  return (
    <div className="fixed z-[999] left-0 top-0 w-full h-full overflow-auto bg-[rgba(0,0,0,0.4)] p-4 w-full flex justify-center items-center h-auto">
      <div
        className="absolute text-black top-[30%] p-6 min-w-[300px] rounded-lg bg-white md:w-[400px] shadow-lg"
        ref={modalRef}
      >
        {close && (
          <Image
            src="/images/Cross.png"
            alt="close"
            width={40}
    				height={40}
            className="w-6 cursor-pointer absolute right-4 top-3"
            onClick={() => close(false)}
          />
        )}
        {children}
      </div>
    </div>
  );
};
