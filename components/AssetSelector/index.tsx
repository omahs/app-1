import { useEffect, useState, useContext } from 'react';

import Select from 'components/common/Select';

import useContract from 'hooks/useContract';

import { AddressContext } from 'contexts/AddressContext';
import AuditorContext from 'contexts/AuditorContext';

import { getContractsByEnv } from 'utils/utils';
import assets from 'dictionary/assets.json';

import { Market } from 'types/Market';
import { Assets } from 'types/Assets';
import { UnformattedMarket } from 'types/UnformattedMarket';
import { Option } from 'react-dropdown';

import style from './style.module.scss';
import { Address } from 'types/Address';

type Props = {
  title?: Boolean;
  defaultAddress?: String;
};

function AssetSelector({ title, defaultAddress }: Props) {
  const { address, setAddress } = useContext(AddressContext);
  const auditor = useContext(AuditorContext);

  const { contract } = useContract(auditor.address!, auditor.abi!);
  const [selectOptions, setSelectOptions] = useState<Array<Option>>([]);

  useEffect(() => {
    if (contract) {
      getMarkets();
    }
  }, [contract]);

  async function getMarkets() {
    const marketsAddresses = await contract?.getMarketAddresses();
    const marketsData: Array<UnformattedMarket> = [];

    if (!marketsAddresses) {
      //in case the contract doesn't return any market data
      return;
    }

    marketsAddresses.map((address: string) => {
      return marketsData.push(contract?.getMarketData(address));
    });

    Promise.all(marketsData).then((data: Array<UnformattedMarket>) => {
      const formattedMarkets = formatMarkets(data);
      setSelectOptions(formattedMarkets);

      const defaultOption = data?.find((market) => {
        return market[5] == defaultAddress;
      });

      const formatDefault = defaultOption && formatDefaultOption(defaultOption);
      setAddress(formatDefault ?? formattedMarkets[0]);
    });
  }

  function formatDefaultOption(market: UnformattedMarket) {
    const marketData: Market = {
      symbol: market[0],
      name: market[1],
      address: market[5],
      isListed: market[2],
      collateralFactor: market[4]
    };

    const symbol: keyof Market = marketData.symbol;
    const assetsData: Assets<symbol> = assets;
    const src: string = assetsData[symbol];

    return {
      label: (
        <div className={style.labelContainer}>
          <img src={src} alt={marketData.name} className={style.marketImage} />{' '}
          <span className={style.marketName}>{marketData.name}</span>
        </div>
      ),
      value: marketData.address
    };
  }

  function formatMarkets(markets: Array<UnformattedMarket>) {
    const formattedMarkets = markets.map((market: UnformattedMarket) => {
      const marketData: Market = {
        symbol: market[0],
        name: market[1],
        address: market[5],
        isListed: market[2],
        collateralFactor: market[4]
      };

      const symbol: keyof Market = marketData.symbol;
      const assetsData: Assets<symbol> = assets;
      const src: string = assetsData[symbol];

      return {
        label: (
          <div className={style.labelContainer}>
            <img
              src={src}
              alt={marketData.name}
              className={style.marketImage}
            />{' '}
            <span className={style.marketName}>{marketData.name}</span>
          </div>
        ),
        value: marketData.address
      };
    });

    return formattedMarkets;
  }

  function handleChange(option: Address) {
    setAddress(option);
  }

  return (
    <section className={style.container}>
      {title && <p className={style.title}>Maturity pool</p>}
      <div className={style.selectContainer}>
        <Select
          options={selectOptions}
          onChange={handleChange}
          placeholder={address ?? selectOptions[0]}
          value={address ?? selectOptions[0]}
        />
      </div>
    </section>
  );
}

export default AssetSelector;