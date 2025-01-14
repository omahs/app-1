import { useCallback, useContext, useMemo } from 'react';

import AccountDataContext, { ContextValues } from 'contexts/AccountDataContext';
import type { Previewer } from 'types/contracts';

type AccountDataHook = {
  marketAccount?: Previewer.MarketAccountStructOutput;
  accountData?: Previewer.MarketAccountStructOutput[];
  lastSync?: number;
  getMarketAccount: (symbol: string) => Previewer.MarketAccountStructOutput | undefined;
} & Omit<ContextValues, 'accountData'>;

function useAccountData(symbol: string): Omit<AccountDataHook, 'getMarketAccount'>;
function useAccountData(): Omit<AccountDataHook, 'marketAccount'>;
function useAccountData(
  symbol?: string,
): Omit<AccountDataHook, 'getMarketAccount'> | Omit<AccountDataHook, 'marketAccount'> {
  const ctx = useContext(AccountDataContext);
  if (!ctx) {
    throw new Error('Using AccountDataContext outside of provider');
  }

  const getMarketAccount = useCallback((s: string) => ctx?.accountData?.[s], [ctx]);
  const accountData = useMemo(() => {
    if (!ctx?.accountData) return undefined;
    return Object.values(ctx.accountData).filter(isDefined);
  }, [ctx?.accountData]);

  const marketAccount = useMemo(() => (symbol ? ctx?.accountData?.[symbol] : undefined), [ctx?.accountData, symbol]);

  const mutators = { refreshAccountData: ctx.refreshAccountData, resetAccountData: ctx.resetAccountData };

  if (typeof symbol === 'undefined') {
    return {
      accountData,
      lastSync: ctx.lastSync,
      getMarketAccount,
      ...mutators,
    };
  }

  return {
    marketAccount,
    accountData,
    lastSync: ctx.lastSync,
    ...mutators,
  };
}

function isDefined(ma: Previewer.MarketAccountStructOutput | undefined): ma is Previewer.MarketAccountStructOutput {
  return !!ma;
}

export default useAccountData;
