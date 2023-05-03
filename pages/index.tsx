import React, { useEffect } from 'react';
import type { NextPage } from 'next';
import { Box, Grid } from '@mui/material';

import MarketsHeader from 'components/markets/Header';
import MarketTables from 'components/markets/MarketsTables';
import MarketsBasic from 'components/markets/MarketsBasic';
import BackgroundCircle from 'components/BackgroundCircle';

import { useMarketContext } from 'contexts/MarketContext';
import ReactGA from 'react-ga4';
import useRouter from 'hooks/useRouter';

const Markets: NextPage = () => {
  const { view } = useMarketContext();
  const { pathname } = useRouter();

  useEffect(
    () =>
      void ReactGA.send({
        hitType: 'pageview',
        page: pathname,
        title: `Markets ${view} view`,
        location: '/markets',
      }),
    [pathname, view],
  );

  if (!view) return null;

  return (
    <Grid>
      {view === 'advanced' ? (
        <>
          <MarketsHeader />
          <MarketTables />
        </>
      ) : (
        <Box display="flex" justifyContent="center" mb={2} mt={{ xs: 1, sm: 3 }}>
          <MarketsBasic />
          <BackgroundCircle />
        </Box>
      )}
    </Grid>
  );
};

export default Markets;
