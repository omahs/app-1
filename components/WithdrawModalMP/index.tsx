import { ChangeEvent, useContext, useEffect, useState } from 'react';
import { Contract, ethers } from 'ethers';

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

import parseTimestamp from 'utils/parseTimestamp';
import { getContractData } from 'utils/contracts';

import styles from './style.module.scss';

import LangContext from 'contexts/LangContext';
import { useWeb3Context } from 'contexts/Web3Context';
import FixedLenderContext from 'contexts/FixedLenderContext';

import keys from './translations.json';

type Props = {
  data: Borrow | Deposit;
  closeModal: (props: any) => void;
};

function WithdrawModalMP({ data, closeModal }: Props) {
  const { address, symbol, maturityDate, amount } = data;

  const { web3Provider } = useWeb3Context();

  const lang: string = useContext(LangContext);
  const translations: { [key: string]: LangKeys } = keys;

  const fixedLenderData = useContext(FixedLenderContext);

  const [qty, setQty] = useState<string>('0');
  const [fixedLenderWithSigner, setFixedLenderWithSigner] = useState<Contract | undefined>(
    undefined
  );

  const parsedAmount = ethers.utils.formatUnits(amount, 18);

  useEffect(() => {
    getFixedLenderContract();
  }, []);

  function onMax() {
    setQty(parsedAmount);
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    setQty(e.target.value);
  }

  async function withdraw() {
    const withdraw = await fixedLenderWithSigner?.withdrawFromMaturityPool(
      address,
      ethers.utils.parseUnits(qty!),
      maturityDate
    );
  }

  async function getFixedLenderContract() {
    const filteredFixedLender = fixedLenderData.find((contract) => {
      const args: Array<string> | undefined = contract?.args;
      const contractSymbol: string | undefined = args && args[1];

      return contractSymbol == symbol;
    });

    const fixedLender = await getContractData(
      filteredFixedLender?.address!,
      filteredFixedLender?.abi!,
      web3Provider?.getSigner()
    );

    setFixedLenderWithSigner(fixedLender);
  }

  return (
    <>
      <section className={styles.formContainer}>
        <ModalTitle title={translations[lang].withdraw} />
        <ModalAsset asset={symbol} amount={parsedAmount} />
        <ModalClose closeModal={closeModal} />
        <ModalRow text={translations[lang].maturityPool} value={parseTimestamp(maturityDate)} />
        <ModalInput onMax={onMax} value={qty} onChange={handleInputChange} />
        <ModalRow text={translations[lang].exactlyBalance} value={parsedAmount} line />
        <ModalRow text={translations[lang].interestRate} value="X %" line />
        <ModalRow text={translations[lang].interestRateSlippage} value={'X %'} />
        <div className={styles.buttonContainer}>
          <Button
            text={translations[lang].withdraw}
            className={qty <= '0' || !qty ? 'secondaryDisabled' : 'tertiary'}
            onClick={withdraw}
          />
        </div>
      </section>
      <Overlay closeModal={closeModal} />
    </>
  );
}

export default WithdrawModalMP;
