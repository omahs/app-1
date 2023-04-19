import type { NextPage } from 'next';
import dynamic from 'next/dynamic';
import React, { useEffect } from 'react';

import Grid from '@mui/material/Grid';
import DashboardHeader from 'components/dashboard/DashboardHeader';
import useAnalytics from 'hooks/useAnalytics';
import ReactGA from 'react-ga4';
import useRouter from 'hooks/useRouter';

const DashboardContent = dynamic(() => import('components/dashboard/DashboardContent'));

const DashBoard: NextPage = () => {
  const { page } = useAnalytics();
  const { pathname } = useRouter();

  useEffect(() => void page(), [page]);
  useEffect(
    () => ReactGA.send({ hitType: 'pageview', page: pathname, title: `Dashboard`, location: '/dashboard' }),
    [pathname],
  );
  return (
    <Grid>
      <DashboardHeader />
      <DashboardContent />
    </Grid>
  );
};

export default DashBoard;
