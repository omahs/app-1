import { useContext } from 'react';

import Item from './Item';

import LangContext from 'contexts/LangContext';

import { LangKeys } from 'types/Lang';
import { Option } from 'react-dropdown';

import styles from './style.module.scss';

import keys from './translations.json';
import { Deposit } from 'types/Deposit';
import { Borrow } from 'types/Borrow';

type Props = {
  type: Option;
  deposits: Deposit[],
  borrows: Borrow[]
};

function MaturityPoolUserStatusByAsset({ type, deposits, borrows }: Props) {
  const lang: string = useContext(LangContext);
  const translations: { [key: string]: LangKeys } = keys;

  return (
    <div className={styles.container}>
      <div className={styles.market}>
        <div className={styles.column}>
          <div className={styles.tableRow}>
            <span className={styles.symbol}>{translations[lang].asset}</span>
            <span className={styles.title}>
              {translations[lang].amount}
            </span>
            <span className={styles.title}>{translations[lang].fixedRate}</span>
            <span className={styles.title}>
              {translations[lang].maturityDate}
            </span>
            <span className={styles.title}>{translations[lang].progress}</span>
            <span className={styles.title} />
          </div>

          {type.value == 'borrow' && (
            borrows.map((borrow: Borrow, key: number) => {
              return (
                <Item type={type} key={key} amount={borrow.amount} fee={borrow.fee} maturityDate={borrow.maturityDate} />
              )
            })
          )}

          {type.value == 'deposit' && (
            deposits.map((deposit: Deposit, key: number) => {
              return (
                <Item type={type} key={key} amount={deposit.amount} fee={deposit.fee} maturityDate={deposit.maturityDate} />
              )
            })
          )}

        </div>
      </div>
    </div>
  );
}

export default MaturityPoolUserStatusByAsset;