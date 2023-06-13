import type { NextPage } from 'next';
import dynamic from 'next/dynamic';
import React, { useEffect } from 'react';

import Grid from '@mui/material/Grid';
import DashboardHeader from 'components/dashboard/DashboardHeader';
import useAnalytics from 'hooks/useAnalytics';
import Leverager from 'components/Leverager';

const DashboardContent = dynamic(() => import('components/dashboard/DashboardContent'));

const DashBoard: NextPage = () => {
  const { page } = useAnalytics();
  useEffect(() => void page(), [page]);

  return (
    <Grid>
      <DashboardHeader />
      <Leverager />
      <DashboardContent />
    </Grid>
  );
};

export default DashBoard;
