import React from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { twMerge } from "tailwind-merge";

interface LayoutProp {
  children: React.ReactNode;
}
export const Layout = ({ children }: LayoutProp) => {
  return (
    <div
      className={twMerge(
        "min-h-[100vh] flex flex-col justify-between relative"
      )}
    >
      <Header />
      {children}
      <Footer />
    </div>
  );
};
