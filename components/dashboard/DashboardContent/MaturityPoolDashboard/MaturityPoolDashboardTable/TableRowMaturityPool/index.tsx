import { BigNumber, formatFixed } from '@ethersproject/bignumber';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Button, IconButton, Skeleton, Stack, TableCell, TableRow, Typography } from '@mui/material';
import StyledLinearProgress from 'components/common/LinearProgress';
import AccountDataContext from 'contexts/AccountDataContext';
import { MarketContext } from 'contexts/MarketContext';
import ModalStatusContext from 'contexts/ModalStatusContext';
import { useWeb3Context } from 'contexts/Web3Context';
import useMaturityPoolTransactions from 'hooks/useMaturityPoolTransactions';
import Image from 'next/image';
import Link from 'next/link';

import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MaturityPoolTransaction } from 'types/MaturityPoolTransaction';
import formatNumber from 'utils/formatNumber';
import formatSymbol from 'utils/formatSymbol';
import parseTimestamp from 'utils/parseTimestamp';
import CollapseMaturityPool from '../CollapseMaturityPool';

type Props = {
  symbol: string;
  amount: BigNumber;
  type: 'deposit' | 'borrow';
  maturityDate: string;
  market: string;
  decimals: number;
};

function TableRowMaturityPool({ symbol, amount, type, maturityDate, market, decimals }: Props) {
  const { walletAddress } = useWeb3Context();
  const { accountData } = useContext(AccountDataContext);
  const { setOpen: openOperationModal, setOperation } = useContext(ModalStatusContext);
  const { setMarket, setDate } = useContext(MarketContext);
  const { withdrawTxs, repayTxs, depositTxs, borrowTxs } = useMaturityPoolTransactions(type, maturityDate, market);

  const [open, setOpen] = useState(false);
  const [transactions, setTransactions] = useState<MaturityPoolTransaction[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number | undefined>();
  const [APR, setAPR] = useState<number | undefined>();

  const getRate = useCallback(() => {
    if (!symbol || !accountData) return;
    const rate = parseFloat(formatFixed(accountData[symbol].usdPrice, 18));

    setExchangeRate(rate);
  }, [accountData, symbol]);

  const getMaturityData = useCallback(async () => {
    const allTransactions = [...withdrawTxs, ...repayTxs, ...depositTxs, ...borrowTxs].sort(
      (a, b) => parseInt(b.timestamp) - parseInt(b.timestamp),
    );

    if (!allTransactions || !exchangeRate) return;
    // txs.sort((a, b) => b.timestamp - a.timestamp)
    const transformedTxs = allTransactions.map((transaction: any) => {
      const assets = symbol && formatFixed(transaction.assets, decimals);

      const txType = transaction?.fee
        ? type === 'borrow'
          ? 'Borrow'
          : 'Deposit'
        : type === 'borrow'
        ? 'Repay'
        : 'Withdraw';

      const isBorrowOrDeposit = txType.toLowerCase() === 'borrow' || txType.toLowerCase() === 'deposit';
      const date = parseTimestamp(transaction?.timestamp || '0');
      const amountUSD = (parseFloat(assets) * exchangeRate).toFixed(2);

      return {
        id: transaction.id,
        type: txType,
        date,
        amount: assets,
        amountUSD,
        isBorrowOrDeposit,
      };
    });

    setTransactions(transformedTxs);
  }, [withdrawTxs, repayTxs, depositTxs, borrowTxs, type, exchangeRate, decimals, symbol]);

  const getAPR = useCallback(async () => {
    const allTransactions = [...depositTxs, ...borrowTxs];
    if (!allTransactions) return;

    let allAPRbyAmount = 0;
    let allAmounts = 0;

    allTransactions.forEach((transaction) => {
      const transactionFee = parseFloat(formatFixed(transaction.fee, decimals));
      const transactionAmount = parseFloat(formatFixed(transaction.assets, decimals));
      const transactionRate = transactionFee / transactionAmount;
      const transactionTimestamp = parseFloat(transaction.timestamp);
      const transactionMaturity = parseFloat(transaction.maturity);
      const time = 31536000 / (transactionMaturity - transactionTimestamp);

      const transactionAPR = transactionRate * time * 100;

      allAPRbyAmount += transactionAPR * transactionAmount;
      allAmounts += transactionAmount;
    });

    const averageAPR = allAPRbyAmount / allAmounts;

    setAPR(averageAPR);
  }, [depositTxs, borrowTxs, decimals]);

  const progress = useMemo(() => {
    const oneHour = 3600;
    const oneDay = oneHour * 24;
    const maturityLife = oneDay * 7 * 12;
    const nowInSeconds = Date.now() / 1000;
    const startDate = parseInt(maturityDate) - maturityLife;
    const current = nowInSeconds - startDate;
    return (current * 100) / maturityLife;
  }, [maturityDate]);

  useEffect(() => {
    getRate();
    getMaturityData();
  }, [maturityDate, walletAddress, accountData, getMaturityData, getRate]);

  useEffect(() => {
    getAPR();
  }, [walletAddress, accountData, getAPR]);

  return (
    <React.Fragment>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' }, backgroundColor: open ? 'grey.50' : 'transparent' }} hover>
        <Link href={`/assets/${symbol}`}>
          <TableCell component="th" align="left" sx={{ cursor: 'pointer' }} width={240}>
            <Stack direction="row" spacing={1}>
              {(symbol && <Image src={`/img/assets/${symbol}.svg`} alt={symbol} width={24} height={24} />) || (
                <Skeleton sx={{ margin: 'auto' }} variant="circular" height={24} width={24} />
              )}
              <Typography fontWeight="600" ml={1} display="inline" alignSelf="center">
                {(symbol && formatSymbol(symbol)) || <Skeleton sx={{ margin: 'auto' }} />}
              </Typography>
            </Stack>
          </TableCell>
        </Link>
        {/* TODO: add skeleton */}
        <TableCell align="center" size="small">
          {symbol && exchangeRate && amount ? (
            `$${formatNumber(parseFloat(formatFixed(amount, decimals)) * exchangeRate, 'USD', true)}`
          ) : (
            <Skeleton width={40} />
          )}
        </TableCell>
        <TableCell align="center" size="small">{`${(APR || 0).toFixed(2)} %`}</TableCell>
        <TableCell align="center" size="small">
          {maturityDate && parseTimestamp(maturityDate)}
        </TableCell>
        <TableCell align="center" size="small">
          <StyledLinearProgress variant="determinate" value={progress} />
        </TableCell>
        <TableCell align="center" width={50} size="small">
          {(symbol && maturityDate && (
            <Button
              variant="outlined"
              onClick={() => {
                setDate({ value: maturityDate!, label: parseTimestamp(maturityDate!) });
                setMarket({ value: market! });
                setOperation(type === 'borrow' ? 'repayAtMaturity' : 'withdrawAtMaturity');
                openOperationModal(true);
              }}
            >
              {type === 'borrow' ? 'Repay' : 'Withdraw'}
            </Button>
          )) || <Skeleton sx={{ margin: 'auto' }} height={40} />}
        </TableCell>
        <TableCell align="center" size="small">
          <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ padding: 0 }} colSpan={7} size="small">
          <CollapseMaturityPool open={open} transactions={transactions} />
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}

export default TableRowMaturityPool;