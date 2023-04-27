import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { FC, PropsWithChildren } from 'react';
import { Chain, useNetwork, useAccount } from 'wagmi';
import * as wagmiChains from 'wagmi/chains';
import Router from 'next/router';
import useRouter from 'hooks/useRouter';
import useAnalytics from 'hooks/useAnalytics';
import { supportedChains, defaultChain, wagmi } from 'utils/client';
import usePreviousValue from 'hooks/usePreviousValue';
import { getQueryParam } from 'utils/getQueryParam';

function isSupported(id?: number): boolean {
  return Boolean(id && supportedChains.find((c) => c.id === id));
}

type ContextValues = {
  displayNetwork: Chain;
  updateDisplayNetwork: (c: Chain) => void;
};

const NetworkContext = createContext<ContextValues | null>(null);

export const NetworkContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const { pathname, isReady } = useRouter();
  const { connector } = useAccount();
  const { setData } = useAnalytics();
  const { chain } = useNetwork();
  const first = useRef(true);
  const [displayNetwork, setDisplayNetwork] = useState<Chain>(() => {
    const n = getQueryParam('n');
    const queryChain = typeof n === 'string' ? wagmiChains[n as keyof typeof wagmiChains] : undefined;
    if (isSupported(queryChain?.id) && queryChain) {
      void setData({ displayed_network: queryChain.network });
      return queryChain;
    }

    const defChain = defaultChain ?? wagmiChains.mainnet;
    void setData({ displayed_network: defChain.network });
    return defChain;
  });
  const previousChain = usePreviousValue(chain);

  const updateDisplayNetwork = useCallback(
    (c: Chain) => {
      setDisplayNetwork(c);
      void setData({ displayed_network: c.network });
    },
    [setData],
  );

  useEffect(() => {
    if (!wagmi.data || !wagmi.data.chain || !(connector && connector.id === 'safe')) return;
    const safeChainID = wagmi.data.chain.id;
    if (isSupported(safeChainID)) {
      const safeChain = supportedChains.find((c) => c.id === safeChainID);
      updateDisplayNetwork(safeChain as Chain);
    }
  }, [connector, updateDisplayNetwork]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }

    if (previousChain && chain && isSupported(chain.id) && previousChain.id !== chain.id) {
      return updateDisplayNetwork(chain);
    }
  }, [previousChain, chain, displayNetwork, updateDisplayNetwork]);

  useEffect(() => {
    if (first.current || !isReady) {
      return;
    }

    const network = { [wagmiChains.mainnet.id]: 'mainnet' }[displayNetwork.id] ?? displayNetwork.network;
    Router.replace({ query: { ...Router.query, n: network } });
  }, [displayNetwork, pathname, isReady]);

  const value: ContextValues = {
    displayNetwork,
    updateDisplayNetwork,
  };

  return <NetworkContext.Provider value={value}>{first.current ? null : children}</NetworkContext.Provider>;
};

export function useNetworkContext() {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    throw new Error('Using NetworkContext outside of provider');
  }
  return ctx;
}

export default NetworkContext;
