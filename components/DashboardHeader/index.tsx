import { useContext } from 'react';

import DonutChart from 'components/DonutChart';

import LangContext from 'contexts/LangContext';

import { LangKeys } from 'types/Lang';

import styles from './style.module.scss';

import keys from './translations.json';
import Tooltip from 'components/Tooltip';

function DashboardHeader() {
  const lang: string = useContext(LangContext);
  const translations: { [key: string]: LangKeys } = keys;

  const defaultDepositData = [
    {
      label: 'DAI',
      value: 100,
      color: '#F19D2B',
      image: '/img/assets/dai.png'
    },
    {
      label: 'ETH',
      value: 100,
      color: '#627EEA',
      image: '/img/assets/ether.png'
    },
    {
      label: 'USDC',
      value: 100,
      color: '#2775CA',
      image: '/img/assets/usdc.png'
    },
    {
      label: 'WBTC',
      value: 100,
      color: '#282138',
      image: '/img/assets/wbtc.png'
    }
  ];

  const defaultRateData = [
    {
      label: 'Deposited',
      value: 75,
      color: '#4D4DE8'
    },
    {
      label: 'Borrowed',
      value: 25,
      color: '#7BF5E1'
    }
  ];

  const defaultHealthFactorData = [
    {
      label: '',
      value: 50,
      color: '#63CA10'
    },
    {
      label: '',
      value: 50,
      color: '#AF0606'
    }
  ];

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.box}>
          <h3 className={styles.title}>
            {translations[lang].deposits}{' '}
            <Tooltip value={translations[lang].deposits} />
          </h3>
          <p className={styles.value}>$6,724</p>
          <p className={styles.subvalue}>2.14% {translations[lang].apr}</p>
        </div>
        <div className={styles.chartContainer}>
          <DonutChart data={defaultDepositData} small />
          <div className={styles.detail}>
            {defaultDepositData.map((asset, key) => {
              return <Tooltip key={key} value={'$1234'} image={asset.image} />;
            })}
          </div>
        </div>
        <div className={styles.line}></div>
        <div className={styles.box}>
          <h3 className={styles.title}>
            {translations[lang].rateComposition}{' '}
            <Tooltip value={translations[lang].rateComposition} />
          </h3>
          <div className={styles.informationContainer}>
            <div className={styles.information}>
              <p className={styles.informationTitle}>
                {translations[lang].variable}
              </p>
              <p className={styles.informationValue}>50%</p>
            </div>
            <div className={styles.information}>
              <p className={styles.informationTitle}>
                {translations[lang].fixed}
              </p>
              <p className={styles.informationValue}>50%</p>
            </div>
          </div>
        </div>
        <div className={styles.chartContainer}>
          <DonutChart data={defaultRateData} />
        </div>
      </div>
      <div className={styles.container}>
        <div className={styles.box}>
          <h3 className={styles.title}>
            {translations[lang].borrows}{' '}
            <Tooltip value={translations[lang].borrows} />
          </h3>
          <p className={styles.value}>$6,724</p>
          <p className={styles.subvalue}>2.14% {translations[lang].apr}</p>
        </div>
        <div className={styles.chartContainer}>
          <DonutChart data={defaultDepositData} small />
          <div className={styles.detail}>
            {defaultDepositData.map((asset, key) => {
              return <Tooltip key={key} value={'$1234'} image={asset.image} />;
            })}
          </div>
        </div>
        <div className={styles.line}></div>
        <div className={styles.box}>
          <h3 className={styles.title}>
            {translations[lang].healthFactor}{' '}
            <Tooltip value={translations[lang].healthFactor} />
          </h3>
          <div className={styles.informationContainer}>
            <div className={styles.information}>
              <p className={styles.informationTitle}>
                {translations[lang].deposited}
              </p>
              <p className={styles.informationValue}>50%</p>
            </div>
            <div className={styles.information}>
              <p className={styles.informationTitle}>
                {translations[lang].borrowed}
              </p>
              <p className={styles.informationValue}>50%</p>
            </div>
          </div>
        </div>
        <div className={styles.chartContainer}>
          <DonutChart data={defaultHealthFactorData} insideValue={'6,6%'} />
        </div>
      </div>
    </section>
  );
}

export default DashboardHeader;