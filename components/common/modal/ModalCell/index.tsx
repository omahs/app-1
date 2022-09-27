import Skeleton from 'react-loading-skeleton';
import Image from 'next/image';

import styles from './style.module.scss';

type Props = {
  text: string;
  textTooltip?: string;
  value?: string;
  valueTooltip?: string;
  line?: boolean;
  asset?: string;
  column?: boolean;
};

function ModalCell({ text, value, line, asset }: Props) {
  return (
    <section className={line ? `${styles.row} ${styles.line}` : styles.row}>
      <p className={styles.text}>{text}</p>

      <>
        {asset && (
          <Image
            src={`/img/assets/${asset.toLowerCase()}.svg`}
            alt={asset}
            width="24"
            height="24"
          />
        )}

        <p className={styles.value}>{value || <Skeleton />}</p>
      </>
    </section>
  );
}

export default ModalCell;