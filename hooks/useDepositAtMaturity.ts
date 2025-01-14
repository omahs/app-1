import { useCallback, useMemo, useState } from 'react';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { WeiPerEther, Zero } from '@ethersproject/constants';
import { useOperationContext } from 'contexts/OperationContext';
import useAccountData from 'hooks/useAccountData';
import useApprove from 'hooks/useApprove';
import useBalance from 'hooks/useBalance';
import useHandleOperationError from 'hooks/useHandleOperationError';
import usePreviewer from 'hooks/usePreviewer';
import { useWeb3 } from 'hooks/useWeb3';
import { useTranslation } from 'react-i18next';
import { OperationHook } from 'types/OperationHook';
import useAnalytics from './useAnalytics';
import { defaultAmount, gasLimitMultiplier } from 'utils/const';
import { CustomError } from 'types/Error';
import useEstimateGas from './useEstimateGas';

type DepositAtMaturity = {
  deposit: () => void;
  updateAPR: () => void;
  optimalDepositAmount: BigNumber | undefined;
  rawSlippage: string;
  setRawSlippage: (value: string) => void;
  fixedRate: BigNumber | undefined;
  gtMaxYield: boolean;
} & OperationHook;

export default (): DepositAtMaturity => {
  const { t } = useTranslation();
  const { transaction } = useAnalytics();
  const { walletAddress } = useWeb3();

  const {
    symbol,
    setErrorData,
    qty,
    setQty,
    setTx,
    date,
    requiresApproval,
    setRequiresApproval,
    isLoading: isLoadingOp,
    setIsLoading: setIsLoadingOp,
    marketContract,
    assetContract,
    ETHRouterContract,
    rawSlippage,
    setRawSlippage,
    slippage,
    setErrorButton,
  } = useOperationContext();
  const { marketAccount } = useAccountData(symbol);

  const handleOperationError = useHandleOperationError();

  const [fixedRate, setFixedRate] = useState<BigNumber | undefined>();
  const [gtMaxYield, setGtMaxYield] = useState<boolean>(false);

  const walletBalance = useBalance(symbol, assetContract);

  const previewerContract = usePreviewer();

  const {
    approve,
    estimateGas: approveEstimateGas,
    isLoading: approveIsLoading,
    needsApproval,
  } = useApprove('depositAtMaturity', assetContract, marketAccount?.market);

  const estimate = useEstimateGas();

  const previewGasCost = useCallback(
    async (quantity: string): Promise<BigNumber | undefined> => {
      if (
        !marketAccount ||
        !walletAddress ||
        !marketContract ||
        !ETHRouterContract ||
        !date ||
        !quantity ||
        (walletBalance && parseFloat(quantity) > parseFloat(walletBalance))
      )
        return;

      if (await needsApproval(quantity)) {
        return approveEstimateGas();
      }

      if (marketAccount.assetSymbol === 'WETH') {
        const amount = quantity ? parseFixed(quantity, 18) : defaultAmount;
        const minAmount = amount.mul(slippage).div(WeiPerEther);
        const populated = await ETHRouterContract.populateTransaction.depositAtMaturity(date, minAmount, {
          value: amount,
        });
        const gasCost = await estimate(populated);
        if (amount.add(gasCost ?? Zero).gte(parseFixed(walletBalance || '0', 18))) {
          throw new CustomError(t('Reserve ETH for gas fees.'), 'warning');
        }
        return gasCost;
      }

      const amount = quantity ? parseFixed(quantity, marketAccount.decimals) : defaultAmount;
      const minAmount = amount.mul(slippage).div(WeiPerEther);

      const populated = await marketContract.populateTransaction.depositAtMaturity(
        date,
        amount,
        minAmount,
        walletAddress,
      );

      return estimate(populated);
    },
    [
      marketAccount,
      walletAddress,
      marketContract,
      ETHRouterContract,
      date,
      walletBalance,
      needsApproval,
      slippage,
      estimate,
      approveEstimateGas,
      t,
    ],
  );

  const isLoading = useMemo(() => approveIsLoading || isLoadingOp, [approveIsLoading, isLoadingOp]);

  const onMax = useCallback(() => {
    if (walletBalance) {
      setQty(walletBalance);
      setErrorData(undefined);
    }
  }, [setErrorData, setQty, walletBalance]);

  const { optimalDepositAmount, depositRate } = useMemo<{
    optimalDepositAmount?: BigNumber;
    depositRate?: BigNumber;
  }>(() => {
    if (!marketAccount) return { optimalDepositAmount: Zero, depositRate: Zero };

    const { fixedPools = [] } = marketAccount;
    const pool = fixedPools.find(({ maturity }) => maturity.toNumber() === date);
    return {
      optimalDepositAmount: pool?.optimalDeposit,
      depositRate: pool?.depositRate,
    };
  }, [marketAccount, date]);

  const handleInputChange = useCallback(
    (value: string) => {
      if (!marketAccount) return;
      const { decimals } = marketAccount;
      setQty(value);

      if (walletBalance && parseFloat(value) > parseFloat(walletBalance)) {
        setErrorButton(t('Insufficient balance'));
        return;
      }
      setErrorButton(undefined);
      setErrorData(undefined);

      setGtMaxYield(!!optimalDepositAmount && parseFixed(value || '0', decimals).gt(optimalDepositAmount));
    },
    [setQty, walletBalance, setErrorButton, setErrorData, optimalDepositAmount, marketAccount, t],
  );

  const deposit = useCallback(async () => {
    if (!marketAccount || !date || !qty || !ETHRouterContract || !marketContract || !walletAddress) return;

    let depositTx;
    setIsLoadingOp(true);

    try {
      transaction.addToCart();
      const amount = parseFixed(qty, marketAccount.decimals);
      const minAmount = amount.mul(slippage).div(WeiPerEther);

      if (marketAccount.assetSymbol === 'WETH') {
        const gasEstimation = await ETHRouterContract.estimateGas.depositAtMaturity(date, minAmount, {
          value: amount,
        });

        depositTx = await ETHRouterContract.depositAtMaturity(date, minAmount, {
          value: amount,
          gasLimit: gasEstimation.mul(gasLimitMultiplier).div(WeiPerEther),
        });
      } else {
        const gasEstimation = await marketContract.estimateGas.depositAtMaturity(
          date,
          amount,
          minAmount,
          walletAddress,
        );

        depositTx = await marketContract.depositAtMaturity(date, amount, minAmount, walletAddress, {
          gasLimit: gasEstimation.mul(gasLimitMultiplier).div(WeiPerEther),
        });
      }

      transaction.beginCheckout();
      setTx({ status: 'processing', hash: depositTx.hash });

      const { status, transactionHash } = await depositTx.wait();
      setTx({ status: status ? 'success' : 'error', hash: transactionHash });

      if (status) transaction.purchase();
    } catch (error) {
      transaction.removeFromCart();
      if (depositTx) setTx({ status: 'error', hash: depositTx.hash });
      setErrorData({ status: true, message: handleOperationError(error) });
    } finally {
      setIsLoadingOp(false);
    }
  }, [
    marketAccount,
    date,
    qty,
    ETHRouterContract,
    marketContract,
    walletAddress,
    setIsLoadingOp,
    transaction,
    slippage,
    setTx,
    setErrorData,
    handleOperationError,
  ]);

  const handleSubmitAction = useCallback(async () => {
    if (isLoading) return;
    if (requiresApproval) {
      await approve();
      setRequiresApproval(await needsApproval(qty));
      return;
    }

    return deposit();
  }, [approve, deposit, isLoading, needsApproval, qty, requiresApproval, setRequiresApproval]);

  const updateAPR = useCallback(async () => {
    if (!marketAccount || !date || !previewerContract || !depositRate) {
      setFixedRate(undefined);
      return;
    }

    if (qty) {
      const initialAssets = parseFixed(qty, marketAccount.decimals);
      try {
        const { assets: finalAssets } = await previewerContract.previewDepositAtMaturity(
          marketAccount.market,
          date,
          initialAssets,
        );
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const rate = finalAssets.mul(WeiPerEther).div(initialAssets);
        const fixedAPR = rate.sub(WeiPerEther).mul(31_536_000).div(BigNumber.from(date).sub(currentTimestamp));

        setFixedRate(fixedAPR);
      } catch (error) {
        setFixedRate(undefined);
      }
    } else {
      setFixedRate(depositRate);
    }
  }, [marketAccount, date, previewerContract, depositRate, qty]);

  return {
    isLoading,
    onMax,
    handleInputChange,
    handleSubmitAction,
    deposit,
    updateAPR,
    optimalDepositAmount,
    rawSlippage,
    setRawSlippage,
    fixedRate,
    gtMaxYield,
    previewGasCost,
    needsApproval,
  };
};
