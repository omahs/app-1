import { useMemo } from 'react';
import { Contract } from '@ethersproject/contracts';
import { useProvider } from 'wagmi';
import type { Previewer } from 'types/contracts/Previewer';
import mainnetPreviewer from '@exactly-protocol/protocol/deployments/mainnet/Previewer.json' assert { type: 'json' };
import goerliPreviewer from '@exactly-protocol/protocol/deployments/goerli/Previewer.json' assert { type: 'json' };
import previewerABI from 'abi/Previewer.json' assert { type: 'json' };
import { useWeb3 } from './useWeb3';

export default () => {
  const { chain } = useWeb3();
  const provider = useProvider({ chainId: chain?.id });

  return useMemo(() => {
    if (!chain || !chain) return null;

    // TODO: add optimism network
    const address = {
      5: goerliPreviewer.address,
      1: mainnetPreviewer.address,
    }[chain.id];

    if (!address) return null;
    return new Contract(address, previewerABI, provider) as Previewer;
  }, [chain, provider]);
};
