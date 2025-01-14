import React, { useMemo } from 'react';
import { BigNumber, formatFixed, parseFixed } from '@ethersproject/bignumber';
import { Zero } from '@ethersproject/constants';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { Box } from '@mui/material';
import Image from 'next/image';

import useAccountData from 'hooks/useAccountData';
import formatNumber from 'utils/formatNumber';
import ModalInfo, { Variant, FromTo } from 'components/common/modal/ModalInfo';
import { isFixedOperation, Operation } from 'contexts/ModalStatusContext';
import formatSymbol from 'utils/formatSymbol';
import { useTranslation } from 'react-i18next';
import { useMarketContext } from 'contexts/MarketContext';

type Props = {
  qty: string;
  symbol: string;
  operation: Extract<Operation, 'repay' | 'repayAtMaturity' | 'borrow' | 'borrowAtMaturity'>;
  variant?: Variant;
};

function ModalInfoTotalBorrows({ qty, symbol, operation, variant = 'column' }: Props) {
  const { t } = useTranslation();
  const { marketAccount } = useAccountData(symbol);
  const { date } = useMarketContext();

  const [from, to] = useMemo(() => {
    if (!marketAccount) return [undefined, undefined];

    const delta = parseFixed(qty || '0', marketAccount.decimals);

    let f: BigNumber = marketAccount.floatingBorrowAssets;
    if (isFixedOperation(operation) && date) {
      const pool = marketAccount.fixedBorrowPositions.find(({ maturity }) => maturity.toNumber() === date);
      f = pool ? pool.position.principal.add(pool.position.fee) : Zero;
    }

    let debt = f[operation.startsWith('borrow') ? 'add' : 'sub'](delta);
    debt = debt.lt(Zero) ? Zero : debt;

    return [
      formatNumber(formatFixed(f, marketAccount.decimals), symbol),
      formatNumber(formatFixed(debt, marketAccount.decimals), symbol),
    ];
  }, [marketAccount, qty, operation, date, symbol]);

  return (
    <ModalInfo label={t('Debt amount')} icon={SwapHorizIcon} variant={variant}>
      <Box display="flex" alignItems="center" gap={0.5}>
        {variant === 'column' && (
          <Image
            src={`/img/assets/${symbol}.svg`}
            alt={formatSymbol(symbol)}
            width={16}
            height={16}
            style={{
              maxWidth: '100%',
              height: 'auto',
            }}
          />
        )}
        <FromTo from={from} to={to} variant={variant} />
      </Box>
    </ModalInfo>
  );
}

export default React.memo(ModalInfoTotalBorrows);
