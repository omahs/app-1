import { parseFixed } from '@ethersproject/bignumber';
import { MaxUint256, WeiPerEther } from '@ethersproject/constants';
import { ErrorCode } from '@ethersproject/logger';
import { captureException } from '@sentry/nextjs';
import { useCallback, useState } from 'react';
import { ERC20, Market } from 'types/contracts';
import { ErrorData } from 'types/Error';
import numbers from 'config/numbers.json';

export default (contract?: ERC20 | Market, spender?: string) => {
  const [errorData, setErrorData] = useState<ErrorData | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const estimateGas = useCallback(async () => {
    if (!contract || !spender) return;

    return contract.estimateGas.approve(spender, MaxUint256);
  }, [spender, contract]);

  const approve = useCallback(async () => {
    if (!contract || !spender) return;

    try {
      setIsLoading(true);
      const gasEstimation = await estimateGas();
      if (!gasEstimation) return;

      const approveTx = await contract.approve(spender, MaxUint256, {
        gasLimit: gasEstimation.mul(parseFixed(String(numbers.gasLimitMultiplier), 18)).div(WeiPerEther),
      });

      // awaits the tx to be confirmed so isLoading stays true
      const txReceipt = await approveTx.wait();
      return txReceipt;
    } catch (error: any) {
      const isDenied = error?.code === ErrorCode.ACTION_REJECTED;

      if (!isDenied) captureException(error);

      setErrorData({
        status: true,
        message: isDenied ? 'Transaction rejected' : 'Approve failed, please try again',
      });
    } finally {
      setIsLoading(false);
    }
  }, [spender, contract]);

  return { approve, estimateGas, isLoading, errorData };
};