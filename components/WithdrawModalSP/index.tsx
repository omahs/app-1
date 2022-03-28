import { ChangeEvent, useContext, useState } from 'react';
import { ethers } from 'ethers';

import Button from 'components/common/Button';
import ModalAsset from 'components/common/modal/ModalAsset';
import ModalClose from 'components/common/modal/ModalClose';
import ModalInput from 'components/common/modal/ModalInput';
import ModalRow from 'components/common/modal/ModalRow';
import ModalTitle from 'components/common/modal/ModalTitle';
import Overlay from 'components/Overlay';

import { Borrow } from 'types/Borrow';
import { Deposit } from 'types/Deposit';
import { LangKeys } from 'types/Lang';

import styles from './style.module.scss';

import LangContext from 'contexts/LangContext';

import keys from './translations.json';

type Props = {
  data: Borrow | Deposit;
  closeModal: (props: any) => void;
  walletAddress: string;
};

function WithdrawModalSP({ data, closeModal, walletAddress }: Props) {
  const { address, symbol, amount } = data;

  const lang: string = useContext(LangContext);
  const translations: { [key: string]: LangKeys } = keys;

  const [qty, setQty] = useState<string>('0');

  const parsedAmount = ethers.utils.formatUnits(amount, 18);

  function onMax() {
    setQty(parsedAmount);
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    setQty(e.target.value);
  }

  function withdrawFromMaturity() {}

  return (
    <>
      <section className={styles.formContainer}>
        <ModalTitle title={translations[lang].withdraw} />
        <ModalAsset asset={symbol} />
        <ModalClose closeModal={closeModal} />

        <ModalInput onMax={onMax} value={qty} onChange={handleInputChange} />
        <ModalRow text={translations[lang].exactlyBalance} value={parsedAmount} line />
        <ModalRow text={translations[lang].healthFactor} values={['1.1', '1.8']} line />
        <ModalRow text={translations[lang].borrowLimit} values={['1000', '2000']} />
        <div className={styles.buttonContainer}>
          <Button
            text={translations[lang].withdraw}
            className={qty <= '0' || !qty ? 'secondaryDisabled' : 'tertiary'}
          />
        </div>
      </section>
      <Overlay closeModal={closeModal} />
    </>
  );
}

export default WithdrawModalSP;
