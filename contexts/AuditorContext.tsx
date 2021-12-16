import { ethers } from "ethers";
import { createContext } from "react";

type ContextValues = {
  address: string | undefined;
  abi: ethers.ContractInterface | undefined;
};

const defaultValues: ContextValues = {
  address: undefined,
  abi: undefined
};

const AuditorContext = createContext(defaultValues);

export const AuditorProvider = AuditorContext.Provider;

export default AuditorContext;