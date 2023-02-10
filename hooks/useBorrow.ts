import { BigNumber, formatFixed, parseFixed } from '@ethersproject/bignumber';
import { WeiPerEther, Zero } from '@ethersproject/constants';
import numbers from 'config/numbers.json';
import AccountDataContext from 'contexts/AccountDataContext';
import { useOperationContext, usePreviewTx } from 'contexts/OperationContext';
import useAccountData from 'hooks/useAccountData';
import useApprove from 'hooks/useApprove';
import useHandleOperationError from 'hooks/useHandleOperationError';
import { useWeb3 } from 'hooks/useWeb3';
import { useCallback, useContext, useMemo } from 'react';
import { HealthFactor } from 'types/HealthFactor';
import analytics from 'utils/analytics';
import getBeforeBorrowLimit from 'utils/getBeforeBorrowLimit';
import getHealthFactorData from 'utils/getHealthFactorData';

const DEFAULT_AMOUNT = BigNumber.from(numbers.defaultAmount);

type Borrow = {
  isLoading: boolean;
  onMax: () => void;
  handleInputChange: (value: string) => void;
  handleSubmitAction: () => void;
  borrow: () => void;
};

export default (): Borrow => {
  const { walletAddress } = useWeb3();
  const { accountData, getAccountData } = useContext(AccountDataContext);

  const {
    symbol,
    setErrorData,
    qty,
    setQty,
    setTx,
    requiresApproval,
    setRequiresApproval,
    isLoading: isLoadingOp,
    setIsLoading: setIsLoadingOp,
    marketContract,
    ETHRouterContract,
  } = useOperationContext();

  const handleOperationError = useHandleOperationError();

  const { decimals = 18 } = useAccountData(symbol);
  const healthFactor = useMemo<HealthFactor | undefined>(
    () => (accountData ? getHealthFactorData(accountData) : undefined),
    [accountData],
  );

  const {
    approve,
    estimateGas: approveEstimateGas,
    isLoading: approveIsLoading,
    needsApproval,
  } = useApprove('borrow', marketContract, ETHRouterContract?.address);

  const liquidity = useMemo(() => {
    if (!accountData) return undefined;

    const limit = accountData[symbol].floatingAvailableAssets;
    return limit ?? undefined;
  }, [accountData, symbol]);

  const hasCollateral = useMemo(() => {
    if (!accountData) return false;

    return (
      // hasDepositedToFloatingPool
      accountData[symbol].floatingDepositAssets.gt(Zero) ||
      Object.keys(accountData).some((aMarket) => accountData[aMarket].isCollateral)
    );
  }, [accountData, symbol]);

  const previewGasCost = useCallback(
    async (quantity: string): Promise<BigNumber | undefined> => {
      if (!walletAddress || !marketContract || !ETHRouterContract || !quantity) return;

      const gasPrice = (await ETHRouterContract.provider.getFeeData()).maxFeePerGas;
      if (!gasPrice) return;

      if (requiresApproval) {
        const gasEstimation = await approveEstimateGas();
        return gasEstimation?.mul(gasPrice);
      }

      if (symbol === 'WETH') {
        const gasEstimation = await ETHRouterContract.estimateGas.borrow(
          quantity ? parseFixed(quantity, 18) : DEFAULT_AMOUNT,
        );
        return gasPrice.mul(gasEstimation);
      }

      const gasEstimation = await marketContract.estimateGas.borrow(
        quantity ? parseFixed(quantity, decimals) : DEFAULT_AMOUNT,
        walletAddress,
        walletAddress,
      );
      return gasPrice.mul(gasEstimation);
    },
    [walletAddress, marketContract, ETHRouterContract, requiresApproval, symbol, approveEstimateGas, decimals],
  );

  const { isLoading: previewIsLoading } = usePreviewTx({ qty, needsApproval, previewGasCost });

  const isLoading = useMemo(
    () => isLoadingOp || approveIsLoading || previewIsLoading,
    [isLoadingOp, approveIsLoading, previewIsLoading],
  );

  const onMax = useCallback(() => {
    if (!accountData || !healthFactor) return;

    const { adjustFactor, usdPrice, floatingDepositAssets, isCollateral } = accountData[symbol];

    let col = healthFactor.collateral;
    const hf = parseFixed('1.05', 18);
    const WAD = parseFixed('1', 18);

    const hasDepositedToFloatingPool = Number(formatFixed(floatingDepositAssets, decimals)) > 0;

    if (!isCollateral && hasDepositedToFloatingPool) {
      col = col.add(floatingDepositAssets.mul(adjustFactor).div(WAD));
    }

    const debt = healthFactor.debt;

    const safeMaximumBorrow = Number(
      formatFixed(
        col.sub(hf.mul(debt).div(WAD)).mul(WAD).div(hf).mul(WAD).div(usdPrice).mul(adjustFactor).div(WAD),
        18,
      ),
    ).toFixed(decimals);

    setQty(safeMaximumBorrow);
    setErrorData(undefined);
  }, [accountData, healthFactor, symbol, setQty, setErrorData, decimals]);

  const handleInputChange = useCallback(
    (value: string) => {
      if (!liquidity || !accountData) return;

      const { usdPrice } = accountData[symbol];

      const maxBorrowAssets = getBeforeBorrowLimit(accountData[symbol], 'borrow');

      setQty(value);

      if (!hasCollateral)
        return setErrorData({
          status: true,
          message:
            'In order to borrow you need to have a deposit in the Variable Rate Pool marked as collateral in your Dashboard',
        });

      if (liquidity.lt(parseFixed(value || '0', decimals))) {
        return setErrorData({
          status: true,
          message: 'There is not enough liquidity',
        });
      }

      if (
        maxBorrowAssets.lt(
          parseFixed(value || '0', decimals)
            .mul(usdPrice)
            .div(WeiPerEther),
        )
      ) {
        return setErrorData({
          status: true,
          message: `You can't borrow more than your borrow limit`,
        });
      }
      setErrorData(undefined);
    },
    [liquidity, accountData, symbol, setQty, hasCollateral, setErrorData, decimals],
  );

  const borrow = useCallback(async () => {
    if (!accountData) return;

    setIsLoadingOp(true);
    let borrowTx;

    try {
      if (symbol === 'WETH') {
        if (!ETHRouterContract) return;

        const amount = parseFixed(qty, 18);
        const gasEstimation = await ETHRouterContract.estimateGas.borrow(amount);
        borrowTx = await ETHRouterContract.borrow(amount, {
          gasLimit: gasEstimation.mul(parseFixed(String(numbers.gasLimitMultiplier), 18)).div(WeiPerEther),
        });
      } else {
        if (!marketContract || !walletAddress) return;

        const amount = parseFixed(qty, decimals);
        const gasEstimation = await marketContract.estimateGas.borrow(amount, walletAddress, walletAddress);
        borrowTx = await marketContract.borrow(amount, walletAddress, walletAddress, {
          gasLimit: gasEstimation.mul(parseFixed(String(numbers.gasLimitMultiplier), 18)).div(WeiPerEther),
        });
      }

      setTx({ status: 'processing', hash: borrowTx.hash });

      const { status, transactionHash } = await borrowTx.wait();

      setTx({ status: status ? 'success' : 'error', hash: transactionHash });

      void analytics.track(status ? 'borrow' : 'borrowRevert', {
        amount: qty,
        asset: symbol,
        hash: transactionHash,
      });

      void getAccountData();
    } catch (error) {
      if (borrowTx?.hash) setTx({ status: 'error', hash: borrowTx.hash });

      setErrorData({
        status: true,
        message: handleOperationError(error),
      });
    } finally {
      setIsLoadingOp(false);
    }
  }, [
    accountData,
    setIsLoadingOp,
    symbol,
    setTx,
    qty,
    getAccountData,
    ETHRouterContract,
    marketContract,
    walletAddress,
    decimals,
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

    void analytics.track('borrowRequest', {
      amount: qty,
      asset: symbol,
    });

    return borrow();
  }, [approve, borrow, isLoading, needsApproval, qty, requiresApproval, setRequiresApproval, symbol]);

  return { isLoading, onMax, handleInputChange, handleSubmitAction, borrow };
};