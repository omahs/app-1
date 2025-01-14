import { BigNumber } from '@ethersproject/bignumber';

export type OperationHook = {
  isLoading: boolean;
  onMax: () => void;
  handleInputChange: (value: string) => void;
  handleSubmitAction: () => Promise<void>;
  needsApproval: (qty: string) => Promise<boolean>;
  previewGasCost: (qty: string) => Promise<BigNumber | undefined>;
};
