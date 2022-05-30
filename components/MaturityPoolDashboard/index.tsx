import { useContext, useEffect, useState } from 'react';
import dayjs from 'dayjs';

import { Option } from 'react-dropdown';
import { LangKeys } from 'types/Lang';
import { FixedLenderAccountData } from 'types/FixedLenderAccountData';

import AccountDataContext from 'contexts/AccountDataContext';

import Tooltip from 'components/Tooltip';
import MaturityPoolUserStatusByMaturity from 'components/MaturityPoolUserStatusByMaturity';
import Button from 'components/common/Button';

import LangContext from 'contexts/LangContext';

import styles from './style.module.scss';

import keys from './translations.json';
import { Deposit } from 'types/Deposit';
import { Borrow } from 'types/Borrow';

interface Props {
  showModal: (data: Deposit | Borrow, type: String) => void;
  tab: Option;
}

function MaturityPoolDashboard({ showModal, tab }: Props) {
  const lang: string = useContext(LangContext);
  const translations: { [key: string]: LangKeys } = keys;

  const { accountData } = useContext(AccountDataContext);

  const [defaultMaturity, setDefaultMaturity] = useState<string>();
  const [maturities, setMaturities] = useState<any>(undefined);

  useEffect(() => {
    if (!defaultMaturity) {
      getDefaultMaturity();
    }
  }, [defaultMaturity]);

  useEffect(() => {
    if (accountData) {
      getMaturityPools();
    }
  }, [accountData]);

  async function getDefaultMaturity() {
    const currentTimestamp = dayjs().unix();
    const interval = 604800;
    const timestamp = currentTimestamp - (currentTimestamp % interval) + interval;

    setDefaultMaturity(timestamp.toString());
  }

  async function getMaturityPools() {
    const data: any = {};

    Object.values(accountData!).forEach((asset: FixedLenderAccountData) => {
      asset.maturitySupplyPositions.forEach((pool) => {
        const date = pool.maturity.toNumber().toString();
        data.deposits = data.deposits ?? {};

        data.deposits[date] = data.deposits[date]
          ? [
              ...data.deposits[date],
              {
                symbol: asset.assetSymbol,
                market: asset.fixedLender,
                fee: pool.position.fee,
                principal: pool.position.principal,
                decimals: asset.decimals
              }
            ]
          : [
              {
                symbol: asset.assetSymbol,
                market: asset.fixedLender,
                fee: pool.position.fee,
                principal: pool.position.principal,
                decimals: asset.decimals
              }
            ];
      });

      asset.maturityBorrowPositions.forEach((pool) => {
        const date = pool.maturity.toNumber().toString();

        data.borrows[date] = data.borrows[date]
          ? [
              ...data.borrows[date],
              {
                symbol: asset.assetSymbol,
                market: asset.fixedLender,
                fee: pool.position.fee,
                principal: pool.position.principal,
                decimals: asset.decimals
              }
            ]
          : [
              {
                symbol: asset.assetSymbol,
                market: asset.fixedLender,
                fee: pool.position.fee,
                principal: pool.position.principal,
                decimals: asset.decimals
              }
            ];
      });
    });

    setMaturities(data);
  }

  return (
    <section className={styles.container}>
      <section className={styles.sectionContainer}>
        <div className={styles.titleContainer}>
          <p className={styles.title}>{translations[lang].maturityPools}</p>
          <Tooltip value={translations[lang].maturityPools} />
        </div>
        <div className={styles.buttonContainer}>
          {accountData && (
            <Button
              text={
                tab.value == 'borrow' ? translations[lang].newBorrow : translations[lang].newDeposit
              }
              className={tab.value == 'borrow' ? 'secondary' : 'primary'}
              onClick={() =>
                showModal(
                  {
                    assets: '0',
                    fee: '0',
                    market: accountData.DAI.fixedLender!,
                    maturity: defaultMaturity!
                  },
                  tab.value
                )
              }
            />
          )}
        </div>
      </section>
      {maturities && (
        <MaturityPoolUserStatusByMaturity
          type={tab}
          maturities={maturities}
          showModal={showModal}
        />
      )}
    </section>
  );
}

export default MaturityPoolDashboard;
