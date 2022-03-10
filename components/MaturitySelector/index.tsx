import { useEffect, useState, useContext } from 'react';
import { Option } from 'react-dropdown';

import Select from 'components/common/Select';
import Tooltip from 'components/Tooltip';

import useContract from 'hooks/useContract';

import style from './style.module.scss';

import { AddressContext } from 'contexts/AddressContext';
import AuditorContext from 'contexts/AuditorContext';

import { Date } from 'types/Date';
import UtilsContext from 'contexts/UtilsContext';
import parseTimeStamp from 'utils/parseTimestamp';

type Props = {
  title?: String;
};

function MaturitySelector({ title }: Props) {
  const { date, setDate } = useContext(AddressContext);
  const utils = useContext(UtilsContext);

  const [dates, setDates] = useState<Array<Option>>([]);
  const utilsContract = useContract(utils.address!, utils.abi!);

  async function getPools() {
    const pools = await utilsContract?.contract?.futurePools(12);

    const dates = pools?.map((pool: any) => {
      return pool.toString();
    });

    const formattedDates = dates?.map((date: any) => {
      return {
        value: date,
        label: parseTimeStamp(date)
      };
    });

    setDates(formattedDates ?? []);
    !date && formattedDates && setDate(formattedDates[0]);
  }

  function handleChange(option: Date) {
    setDate(option);
  }

  useEffect(() => {
    if (dates.length == 0) {
      getPools();
    }
  }, [utilsContract]);

  return (
    <section className={style.sectionContainer}>
      {title && (
        <div className={style.titleContainer}>
          <p className={style.title}>{title}</p>
          <Tooltip value={title} />
        </div>
      )}
      <Select
        options={dates}
        onChange={handleChange}
        placeholder={date?.value ?? dates[0]?.label}
        value={date?.label ?? dates[0]?.value}
      />
    </section>
  );
}

export default MaturitySelector;
