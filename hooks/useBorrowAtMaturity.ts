import { useCallback, useMemo, useState } from 'react';
import { BigNumber, formatFixed, parseFixed } from '@ethersproject/bignumber';
import { WeiPerEther, Zero } from '@ethersproject/constants';
import { useTranslation } from 'react-i18next';
import { useOperationContext } from 'contexts/OperationContext';
import useAccountData from 'hooks/useAccountData';
import useApprove from 'hooks/useApprove';
import useHandleOperationError from 'hooks/useHandleOperationError';
import usePoolLiquidity from 'hooks/usePoolLiquidity';
import usePreviewer from 'hooks/usePreviewer';
import { useWeb3 } from 'hooks/useWeb3';
import { OperationHook } from 'types/OperationHook';
import getBeforeBorrowLimit from 'utils/getBeforeBorrowLimit';
import useHealthFactor from './useHealthFactor';
import useAnalytics from './useAnalytics';
import { defaultAmount, gasLimitMultiplier } from 'utils/const';
import useEstimateGas from './useEstimateGas';

type BorrowAtMaturity = {
  borrow: () => void;
  updateAPR: () => void;
  rawSlippage: string;
  setRawSlippage: (value: string) => void;
  fixedRate: BigNumber | undefined;
  hasCollateral: boolean;
  safeMaximumBorrow: string;
} & OperationHook;

export default (): BorrowAtMaturity => {
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
    ETHRouterContract,
    rawSlippage,
    setRawSlippage,
    slippage,
  } = useOperationContext();

  const handleOperationError = useHandleOperationError();

  const { accountData, marketAccount } = useAccountData(symbol);

  const [fixedRate, setFixedRate] = useState<BigNumber | undefined>();

  const healthFactor = useHealthFactor();
  const minBorrowRate = useMemo<BigNumber | undefined>(() => {
    if (!marketAccount) return;

    const { fixedPools = [] } = marketAccount;
    const pool = fixedPools.find(({ maturity }) => maturity.toNumber() === date);
    return pool?.minBorrowRate;
  }, [marketAccount, date]);

  const previewerContract = usePreviewer();

  const {
    approve,
    estimateGas: approveEstimateGas,
    isLoading: approveIsLoading,
    needsApproval,
  } = useApprove('borrowAtMaturity', marketContract, ETHRouterContract?.address);

  const poolLiquidity = usePoolLiquidity(symbol);

  const hasCollateral = useMemo(() => {
    if (!accountData || !marketAccount) return false;

    return marketAccount.floatingDepositAssets.gt(Zero) || accountData.some((aMarket) => aMarket.isCollateral);
  }, [accountData, marketAccount]);

  const estimate = useEstimateGas();

  const previewGasCost = useCallback(
    async (quantity: string): Promise<BigNumber | undefined> => {
      if (!marketAccount || !walletAddress || !marketContract || !ETHRouterContract || !date || !quantity) return;

      if (await needsApproval(quantity)) {
        return approveEstimateGas();
      }

      if (marketAccount.assetSymbol === 'WETH') {
        const amount = quantity ? parseFixed(quantity, 18) : defaultAmount;
        const maxAmount = amount.mul(slippage).div(WeiPerEther);

        const populated = await ETHRouterContract.populateTransaction.borrowAtMaturity(date, amount, maxAmount);
        return estimate(populated);
      }

      const amount = quantity ? parseFixed(quantity, marketAccount.decimals) : defaultAmount;
      const maxAmount = amount.mul(slippage).div(WeiPerEther);
      const populated = await marketContract.populateTransaction.borrowAtMaturity(
        date,
        amount,
        maxAmount,
        walletAddress,
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
      needsApproval,
      slippage,
      estimate,
      approveEstimateGas,
    ],
  );

  const isLoading = useMemo(() => isLoadingOp || approveIsLoading, [isLoadingOp, approveIsLoading]);

  const safeMaximumBorrow = useMemo((): string => {
    if (!marketAccount || !healthFactor) return '';

    const { usdPrice, adjustFactor, floatingDepositAssets, isCollateral, decimals } = marketAccount;

    let col = healthFactor.collateral;
    const hf = parseFixed('1.05', 18);

    const hasDepositedToFloatingPool = Number(formatFixed(floatingDepositAssets, decimals)) > 0;

    if (!isCollateral && hasDepositedToFloatingPool) {
      col = col.add(floatingDepositAssets.mul(adjustFactor).div(WeiPerEther));
    }

    const { debt } = healthFactor;

    return Math.max(
      0,
      Number(
        formatFixed(
          col
            .sub(hf.mul(debt).div(WeiPerEther))
            .mul(WeiPerEther)
            .div(hf)
            .mul(WeiPerEther)
            .div(usdPrice)
            .mul(adjustFactor)
            .div(WeiPerEther),
          18,
        ),
      ),
    ).toFixed(decimals);
  }, [marketAccount, healthFactor]);

  const onMax = useCallback(() => {
    setQty(safeMaximumBorrow);
    setErrorData(undefined);
  }, [safeMaximumBorrow, setErrorData, setQty]);

  const handleInputChange = useCallback(
    (value: string) => {
      if (!marketAccount) return;
      const { usdPrice, decimals } = marketAccount;

      setQty(value);

      if (poolLiquidity && poolLiquidity < parseFloat(value)) {
        return setErrorData({
          status: true,
          message: t('There is not enough liquidity in this pool'),
        });
      }

      const maxBorrowAssets = getBeforeBorrowLimit(marketAccount, 'borrow');

      if (
        maxBorrowAssets.lt(
          parseFixed(value || '0', decimals)
            .mul(usdPrice)
            .div(WeiPerEther),
        )
      ) {
        return setErrorData({
          status: true,
          message: t("You can't borrow more than your borrow limit"),
        });
      }
      setErrorData(undefined);
    },
    [marketAccount, setQty, poolLiquidity, setErrorData, t],
  );

  const borrow = useCallback(async () => {
    setIsLoadingOp(true);

    if (fixedRate && Number(formatFixed(slippage, 18)) < Number(fixedRate) / 1e18) {
      setIsLoadingOp(false);

      return setErrorData({
        status: true,
        message: t('The transaction failed, please check your Maximum Deposit Rate'),
      });
    }

    if (!marketAccount || !date || !qty || !walletAddress) return;

    const amount = parseFixed(qty, marketAccount.decimals);
    const maxAmount = amount.mul(slippage).div(WeiPerEther);

    let borrowTx;
    try {
      transaction.addToCart();
      if (marketAccount.assetSymbol === 'WETH') {
        if (!ETHRouterContract) throw new Error('ETHRouterContract is undefined');

        const gasEstimation = await ETHRouterContract.estimateGas.borrowAtMaturity(date, amount, maxAmount);

        borrowTx = await ETHRouterContract.borrowAtMaturity(date, amount, maxAmount, {
          gasLimit: gasEstimation.mul(gasLimitMultiplier).div(WeiPerEther),
        });
      } else {
        if (!marketContract) return;

        const gasEstimation = await marketContract.estimateGas.borrowAtMaturity(
          date,
          amount,
          maxAmount,
          walletAddress,
          walletAddress,
        );

        borrowTx = await marketContract.borrowAtMaturity(date, amount, maxAmount, walletAddress, walletAddress, {
          gasLimit: gasEstimation.mul(gasLimitMultiplier).div(WeiPerEther),
        });
      }

      transaction.beginCheckout();

      setTx({ status: 'processing', hash: borrowTx?.hash });

      const { status, transactionHash } = await borrowTx.wait();
      setTx({ status: status ? 'success' : 'error', hash: transactionHash });

      if (status) transaction.purchase();
    } catch (error) {
      transaction.removeFromCart();
      if (borrowTx?.hash) setTx({ status: 'error', hash: borrowTx.hash });

      setErrorData({
        status: true,
        message: handleOperationError(error),
      });
    } finally {
      setIsLoadingOp(false);
    }
  }, [
    setIsLoadingOp,
    fixedRate,
    slippage,
    marketAccount,
    date,
    qty,
    walletAddress,
    setErrorData,
    t,
    transaction,
    setTx,
    ETHRouterContract,
    marketContract,
    handleOperationError,
  ]);

  const updateAPR = useCallback(async () => {
    if (!marketAccount || !date || !previewerContract || !minBorrowRate) {
      setFixedRate(undefined);
      return;
    }

    if (qty) {
      const initialAssets = parseFixed(qty, marketAccount.decimals);
      try {
        const { assets: finalAssets } = await previewerContract.previewBorrowAtMaturity(
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
      setFixedRate(minBorrowRate);
    }
  }, [marketAccount, date, previewerContract, minBorrowRate, qty]);

  const handleSubmitAction = useCallback(async () => {
    if (isLoading) return;
    if (requiresApproval) {
      await approve();
      setRequiresApproval(await needsApproval(qty));
      return;
    }

    return borrow();
  }, [isLoading, requiresApproval, qty, borrow, approve, setRequiresApproval, needsApproval]);

  return {
    isLoading,
    onMax,
    handleInputChange,
    handleSubmitAction,
    borrow,
    updateAPR,
    rawSlippage,
    setRawSlippage,
    fixedRate,
    hasCollateral,
    previewGasCost,
    needsApproval,
    safeMaximumBorrow,
  };
};
