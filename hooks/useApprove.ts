import { parseFixed } from '@ethersproject/bignumber';
import { MaxUint256, WeiPerEther } from '@ethersproject/constants';
import { ErrorCode } from '@ethersproject/logger';
import { useCallback, useState } from 'react';
import { ERC20, Market } from 'types/contracts';
import numbers from 'config/numbers.json';
import { Operation } from 'contexts/ModalStatusContext';
import { useWeb3 } from './useWeb3';
import { useOperationContext } from 'contexts/OperationContext';
import useAccountData from './useAccountData';
import handleOperationError from 'utils/handleOperationError';
import { useNetwork } from 'wagmi';
import { useTranslation } from 'react-i18next';
import { gasLimitMultiplier } from 'utils/const';
import useEstimateGas from './useEstimateGas';
import useAnalytics from './useAnalytics';

export default (operation: Operation, contract?: ERC20 | Market, spender?: string) => {
  const { t } = useTranslation();
  const { walletAddress, chain: displayNetwork } = useWeb3();
  const { chain } = useNetwork();
  const { symbol, setErrorData, setLoadingButton } = useOperationContext();
  const [isLoading, setIsLoading] = useState(false);
  const { transaction } = useAnalytics();

  const { marketAccount } = useAccountData(symbol);

  const estimate = useEstimateGas();

  const estimateGas = useCallback(async () => {
    if (!contract || !spender) return;

    const tx = await contract.populateTransaction.approve(spender, MaxUint256);
    return estimate(tx);
  }, [contract, spender, estimate]);

  const needsApproval = useCallback(
    async (qty: string): Promise<boolean> => {
      switch (operation) {
        case 'deposit':
        case 'depositAtMaturity':
        case 'repay':
        case 'repayAtMaturity':
          if (symbol === 'WETH') return false;
          break;
        case 'withdraw':
        case 'withdrawAtMaturity':
        case 'borrow':
        case 'borrowAtMaturity':
          if (symbol !== 'WETH') return false;
          break;
      }

      if (!walletAddress || !marketAccount || !contract || !spender) return true;

      if (chain?.id !== displayNetwork.id) return true;

      try {
        const allowance = await contract.allowance(walletAddress, spender);
        return (
          allowance.isZero() || allowance.lt(parseFixed(qty || String(numbers.defaultAmount), marketAccount.decimals))
        );
      } catch {
        return true;
      }
    },
    [operation, chain, walletAddress, marketAccount, contract, spender, displayNetwork.id, symbol],
  );

  const approve = useCallback(async () => {
    if (!contract || !spender) return;

    try {
      setIsLoading(true);
      transaction.addToCart('approve');

      setLoadingButton({ label: t('Sign the transaction on your wallet') });
      const gasEstimation = await contract.estimateGas.approve(spender, MaxUint256);
      const approveTx = await contract.approve(spender, MaxUint256, {
        gasLimit: gasEstimation.mul(gasLimitMultiplier).div(WeiPerEther),
      });

      transaction.beginCheckout('approve');

      setLoadingButton({ withCircularProgress: true, label: t('Approving {{symbol}}', { symbol }) });

      const { status } = await approveTx.wait();
      if (status) transaction.purchase('approve');
    } catch (error) {
      transaction.removeFromCart('approve');
      const isDenied = [ErrorCode.ACTION_REJECTED, ErrorCode.TRANSACTION_REPLACED].includes(
        (error as { code: ErrorCode }).code,
      );

      if (!isDenied) handleOperationError(error);

      setErrorData({
        status: true,
        message: isDenied ? t('Transaction rejected') : t('Approve failed, please try again'),
      });
    } finally {
      setIsLoading(false);
      setLoadingButton({});
    }
  }, [contract, spender, transaction, setLoadingButton, t, symbol, setErrorData]);

  return { approve, needsApproval, estimateGas, isLoading };
};
