import { parseFixed } from '@ethersproject/bignumber';
import { getMaturityPoolBorrowsQuery } from 'queries/getMaturityPoolBorrows';
import { getMaturityPoolDepositsQuery } from 'queries/getMaturityPoolDeposits';
import { getMaturityPoolRepaysQuery } from 'queries/getMaturityPoolRepay';
import { getMaturityPoolWithdrawsQuery } from 'queries/getMaturityPoolWithdraw';
import { useCallback, useEffect, useState } from 'react';
import { Borrow } from 'types/Borrow';
import { Deposit } from 'types/Deposit';
import { Repay } from 'types/Repay';
import { WithdrawMP } from 'types/WithdrawMP';
import { useWeb3 } from './useWeb3';
import useAccountData from './useAccountData';
import useGraphClient from './useGraphClient';

export default (type: 'borrow' | 'deposit', maturity: number, market: string) => {
  const { accountData } = useAccountData();
  const { walletAddress } = useWeb3();
  const [withdrawTxs, setWithdrawTxs] = useState<WithdrawMP[]>([]);
  const [repayTxs, setRepayTxs] = useState<Repay[]>([]);
  const [depositTxs, setDepositTxs] = useState<Deposit[]>([]);
  const [borrowTxs, setBorrowTxs] = useState<Borrow[]>([]);
  const request = useGraphClient();

  const getFixedPoolTransactions = useCallback(async () => {
    if (!walletAddress || !maturity || !market || !type || !accountData) return;

    if (type === 'borrow') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getMaturityPoolBorrows = await request<any>(
        getMaturityPoolBorrowsQuery(walletAddress, maturity, market.toLowerCase()),
      );
      if (!getMaturityPoolBorrows) return;

      const borrows: Borrow[] = [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getMaturityPoolBorrows?.borrowAtMaturities.forEach((borrow: any) => {
        const {
          id,
          market: borrowMarket,
          maturity: borrowMaturity,
          assets,
          fee,
          caller,
          receiver,
          borrower,
          timestamp,
          editable,
        } = borrow;

        borrows.push({
          id,
          market: borrowMarket,
          maturity: parseFloat(borrowMaturity),
          assets: parseFixed(assets),
          fee: parseFixed(fee),
          caller,
          receiver,
          borrower,
          timestamp,
          editable,
        });
      });

      setBorrowTxs(borrows);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getMaturityPoolRepays = await request<any>(
        getMaturityPoolRepaysQuery(walletAddress, maturity, market.toLowerCase()),
      );
      if (!getMaturityPoolRepays) return;

      const repays: Repay[] = [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getMaturityPoolRepays?.repayAtMaturities.forEach((repay: any) => {
        const {
          id,
          market: repayMarket,
          maturity: repayMaturity,
          caller,
          borrower,
          assets,
          debtCovered,
          timestamp,
        } = repay;

        repays.push({
          id,
          market: repayMarket,
          maturity: parseFloat(repayMaturity),
          caller,
          borrower,
          assets: parseFixed(assets),
          debtCovered: parseFixed(debtCovered),
          timestamp,
        });
      });

      setRepayTxs(repays);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getMaturityPoolDeposits = await request<any>(
        getMaturityPoolDepositsQuery(walletAddress, maturity, market.toLowerCase()),
      );
      if (!getMaturityPoolDeposits) return;

      const deposits: Deposit[] = [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getMaturityPoolDeposits?.depositAtMaturities.forEach((deposit: any) => {
        const {
          id,
          market: depositMarket,
          symbol,
          maturity: depositMaturity,
          assets,
          fee,
          owner,
          caller,
          timestamp,
          editable,
        } = deposit;

        deposits.push({
          id,
          market: depositMarket,
          symbol,
          maturity: parseFloat(depositMaturity),
          assets: parseFixed(assets),
          fee: parseFixed(fee),
          owner,
          caller,
          timestamp,
          editable,
        });
      });

      setDepositTxs(deposits);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getMaturityPoolWithdraws = await request<any>(
        getMaturityPoolWithdrawsQuery(walletAddress, maturity, market.toLowerCase()),
      );
      if (!getMaturityPoolWithdraws) return;

      const withdraws: WithdrawMP[] = [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getMaturityPoolWithdraws?.withdrawAtMaturities.forEach((withdraw: any) => {
        const {
          id,
          assets,
          market: withdrawMarket,
          maturity: withdrawMaturity,
          owner,
          caller,
          positionAssets,
          receiver,
          timestamp,
        } = withdraw;

        withdraws.push({
          id,
          assets: parseFixed(assets),
          market: withdrawMarket,
          maturity: parseFloat(withdrawMaturity),
          owner,
          caller,
          positionAssets: parseFixed(positionAssets),
          receiver,
          timestamp,
        });
      });

      setWithdrawTxs(withdraws);
    }
  }, [walletAddress, maturity, market, type, accountData, request]);

  useEffect(() => {
    getFixedPoolTransactions();
  }, [getFixedPoolTransactions]);

  return { withdrawTxs, repayTxs, depositTxs, borrowTxs };
};
