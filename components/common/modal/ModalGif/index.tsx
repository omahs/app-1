import { useContext, useEffect, useRef } from 'react';

import styles from './style.module.scss';

import { Dictionary } from 'types/Dictionary';
import { Transaction } from 'types/Transaction';
import { LangKeys } from 'types/Lang';
import { ModalCases } from 'types/ModalCases';

import keys from './translations.json';

import LangContext from 'contexts/LangContext';

type Props = {
  tx: Transaction;
};

function ModalGif({ tx }: Props) {
  const lang: string = useContext(LangContext);
  const translations: { [key: string]: LangKeys } = keys;
  const videoRef = useRef(null);

  // useEffect(() => {
  //   videoRef.current?.load();
  // }, [tx.status]);

  const options: Dictionary<ModalCases> = {
    processing: {
      img: '/img/modals/img/waiting.png',
      video: '/img/modals/video/waiting.mp4',
      title: translations[lang].loadingTitle
    },
    success: {
      img: '/img/modals/img/success.png',
      video: '/img/modals/video/success.mp4',
      title: translations[lang].successTitle
    },
    error: {
      img: '/img/modals/img/error.png',
      video: '/img/modals/video/error.mp4',
      title: translations[lang].errorTitle,
      text: translations[lang].errorText
    }
  };

  console.log(options[tx.status].video);

  return (
    <div className={styles.container}>
      <div className={styles.mediaContainer}>
        <img src="/img/icons/circles.svg" className={styles.img} />
        <video
          ref={videoRef}
          autoPlay
          loop
          poster={options[tx.status].img}
          className={styles.video}
          src={options[tx.status].video}
        />
      </div>
      <h3 className={styles.title}>{options[tx.status].title}</h3>

      {tx.status == 'error' ? (
        <p className={styles.text}>{options[tx.status].text}</p>
      ) : (
        <p className={styles.hash}>
          <span className={styles.hashTitle}>{translations[lang].transactionHash} </span>
          {tx.hash}
        </p>
      )}

      {tx.status != 'loading' && (
        <p className={styles.link}>
          {translations[lang].etherscanText}{' '}
          <a
            className={styles.etherscan}
            href={`https://kovan.etherscan.io/tx/${tx.hash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Etherscan
          </a>
        </p>
      )}

      {tx.status == 'error' && <button> {translations[lang].errorButton}</button>}
    </div>
  );
}

export default ModalGif;
