import Button from 'components/common/Button';
import Loading from 'components/common/Loading';
import { Maturity } from 'types/Maturity';
import styles from './style.module.scss';

import keys from "./translations.json";
import { LangKeys } from 'types/Lang';
import { useContext } from 'react';
import LangContext from 'contexts/LangContext';

interface Props {
  maturities: Array<Maturity> | undefined;
  showModal: (type: string) => void;
}

function AssetTable({ maturities, showModal }: Props) {
  const lang: string = useContext(LangContext);
  const translations: { [key: string]: LangKeys } = keys;

  return (
    <div className={styles.table}>
      <div className={styles.row}>
        <div className={styles.maturity}>{translations[lang].maturity}</div>
        <div className={styles.lastFixedRate}>{translations[lang].lastFixedRate}</div>
        <div className={styles.actions}></div>

      </div>
      {maturities ? (
        <>
          {maturities.map((maturity: Maturity, key: number) => {
            return (
              <div className={styles.row} key={key}>
                <div className={styles.maturity}>
                  <span>{maturity.label}</span>
                  <span className={styles.liquidity}>{translations[lang].liquidity}: $1.3B</span>
                </div>
                <div className={styles.lastFixedRate}>
                  <div className={styles.deposit}>4,41%</div>
                  <div className={styles.borrow}>3,16%</div>
                </div>
                <div className={styles.actions}>
                  <div className={styles.buttonContainer}>
                    <Button text={translations[lang].deposit} className="primary" onClick={() => showModal('deposit')} />
                  </div>
                  <div className={styles.buttonContainer}>
                    <Button text={translations[lang].borrow} className="secondary" onClick={() => showModal('borrow')} />
                  </div>
                </div>

              </div>
            );
          })}
        </>
      ) : (
        <div className={styles.center}>
          <Loading />
        </div>
      )}
    </div>
  );
}

export default AssetTable;