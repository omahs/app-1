import { ethers } from 'ethers';
import request from 'graphql-request';

import { getLastMaturityPoolBorrowRate, getLastMaturityPoolDepositRate } from 'queries';

import { AccountData } from 'types/AccountData';
import { Maturity } from 'types/Maturity';

import { getSymbol } from './utils';
import getSubgraph from './getSubgraph';

async function getLastAPY(
  maturity: Maturity[],
  market: string,
  network: ethers.providers.Network,
  accountData: AccountData
) {
  const subgraphUrl = getSubgraph(network?.name);
  const symbol = getSymbol(market, network?.name ?? process.env.NEXT_PUBLIC_NETWORK);
  const decimals = accountData[symbol].decimals;

  const dataPromise = maturity.map(async (maturity) => {
    try {
      const getLastBorrowRate = await request(
        subgraphUrl,
        getLastMaturityPoolBorrowRate(market, maturity.value)
      );

      const getLastDepositRate = await request(
        subgraphUrl,
        getLastMaturityPoolDepositRate(market, maturity.value)
      );

      const data = {
        getLastBorrowRate,
        getLastDepositRate,
        maturity: maturity.value,
        date: maturity.label
      };

      return data;
    } catch (e) {
      console.log(e);
    }
  });

  return Promise.all(dataPromise).then((data) => {
    const deposit: any = [];
    const borrow: any = [];

    data.forEach((maturityData) => {
      const depositData: any = {
        value: maturityData?.maturity,
        date: maturityData?.date,
        type: 'deposit'
      };
      const borrowData: any = {
        value: maturityData?.maturity,
        date: maturityData?.date,
        type: 'borrow'
      };

      //BORROW
      const borrowFee = maturityData?.getLastBorrowRate?.borrowAtMaturities[0]?.fee;
      const borrowAmount = maturityData?.getLastBorrowRate?.borrowAtMaturities[0]?.assets;

      //DEPOSIT
      const depositFee = maturityData?.getLastDepositRate?.depositAtMaturities[0]?.fee;
      const depositAmount = maturityData?.getLastDepositRate?.depositAtMaturities[0]?.assets;

      //TIME
      const currentTimestamp = new Date().getTime() / 1000;
      const time = 31536000 / (parseInt(maturityData?.maturity!) - currentTimestamp);

      let fixedBorrowAPY = 0;
      let fixedDepositAPY = 0;

      if (borrowFee && decimals && borrowAmount) {
        const borrowFixedRate =
          parseFloat(ethers.utils.formatUnits(borrowFee, decimals)) /
          parseFloat(ethers.utils.formatUnits(borrowAmount, decimals));
        fixedBorrowAPY = (Math.pow(1 + borrowFixedRate, time) - 1) * 100;
      }

      if (depositFee && decimals && depositAmount) {
        const depositFixedRate =
          parseFloat(ethers.utils.formatUnits(depositFee, decimals)) /
          parseFloat(ethers.utils.formatUnits(depositAmount, decimals));
        fixedDepositAPY = (Math.pow(1 + depositFixedRate, time) - 1) * 100;
      }

      depositData.apy = Number(fixedDepositAPY.toFixed(2));
      borrowData.apy = Number(fixedBorrowAPY.toFixed(2));

      deposit.push(depositData);
      borrow.push(borrowData);
    });

    const sortedDeposit = deposit.sort((a: any, b: any) => {
      return parseInt(a.value) - parseInt(b.value);
    });
    const sortedBorrow = borrow.sort((a: any, b: any) => {
      return parseInt(a.value) - parseInt(b.value);
    });

    return { sortedDeposit, sortedBorrow };
  });
}

export default getLastAPY;
