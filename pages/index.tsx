import React, { useEffect } from 'react';
import type { NextPage } from 'next';
import { Box, Grid } from '@mui/material';

import MarketsHeader from 'components/markets/Header';
import MarketTables from 'components/markets/MarketsTables';
import MarketsBasic from 'components/markets/MarketsBasic';
import BackgroundCircle from 'components/BackgroundCircle';

import { useMarketContext } from 'contexts/MarketContext';
import useAnalytics from 'hooks/useAnalytics';
import ReactGA from 'react-ga4';

const Markets: NextPage = () => {
  const { page } = useAnalytics();
  const { view } = useMarketContext();
  useEffect(() => void page(), [page]);
  useEffect(
    () =>
      void ReactGA.send({ hitType: 'pageview', page: `/markets`, title: `Markets ${view} view`, location: '/markets' }),
    [view],
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
