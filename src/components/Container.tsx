import React from "react";

interface ContainerProp {
  children: React.ReactNode;
}
export const Container = ({ children }: ContainerProp) => {
  return <div className="px-4 py-4">{children}</div>;
};
