import AccountDataContext from 'contexts/AccountDataContext';
import { useContext, useMemo } from 'react';
import { FixedLenderAccountData } from 'types/FixedLenderAccountData';
import { FixedPool } from 'types/FixedPool';

export default () => {
  const { accountData } = useContext(AccountDataContext);

  const fixedPools = useMemo(() => {
    if (!accountData) return { deposits: undefined, borrows: undefined };
    const data: Record<string, FixedPool> = {};

    Object.values(accountData).forEach((asset: FixedLenderAccountData) => {
      asset.fixedDepositPositions.forEach((pool) => {
        const date = pool.maturity.toNumber().toString();
        data.deposits = data.deposits ?? {};

        data.deposits[date] = data.deposits[date]
          ? [
              ...data.deposits[date],
              {
                maturity: date,
                symbol: asset.assetSymbol,
                market: asset.market,
                fee: pool.position.fee,
                principal: pool.position.principal,
                decimals: asset.decimals,
              },
            ]
          : [
              {
                maturity: date,
                symbol: asset.assetSymbol,
                market: asset.market,
                fee: pool.position.fee,
                principal: pool.position.principal,
                decimals: asset.decimals,
              },
            ];
      });

      asset.fixedBorrowPositions.forEach((pool) => {
        const date = pool.maturity.toNumber().toString();
        data.borrows = data.borrows ?? {};

        data.borrows[date] = data.borrows[date]
          ? [
              ...data.borrows[date],
              {
                maturity: date,
                symbol: asset.assetSymbol,
                market: asset.market,
                fee: pool.position.fee,
                principal: pool.position.principal,
                decimals: asset.decimals,
              },
            ]
          : [
              {
                maturity: date,
                symbol: asset.assetSymbol,
                market: asset.market,
                fee: pool.position.fee,
                principal: pool.position.principal,
                decimals: asset.decimals,
              },
            ];
      });
    });

    return data;
  }, [accountData]);

  return fixedPools;
};
