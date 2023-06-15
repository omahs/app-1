import React, { useCallback, useMemo } from 'react';
import { Box, Slider, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useLeveragerContext } from 'contexts/LeveragerContext';

const MultiplierSlider = () => {
  const { t } = useTranslation();
  const { input, setLeverageRatio, currentLeverageRatio, minLeverageRatio, maxLeverageRatio } = useLeveragerContext();
  const currentMark = useMemo(() => [{ value: currentLeverageRatio }], [currentLeverageRatio]);
  const onClick = useCallback(() => {
    if (!input.collateralSymbol || !input.borrowSymbol) return;
    setLeverageRatio(currentLeverageRatio);
  }, [currentLeverageRatio, input.borrowSymbol, input.collateralSymbol, setLeverageRatio]);

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="caption" color="figma.grey.600">
          {t('Leverage')}
        </Typography>
        <Box
          display="flex"
          bgcolor={({ palette: { mode } }) => (mode === 'light' ? '#EEEEEE' : '#2A2A2A')}
          px={0.5}
          borderRadius="2px"
          alignItems="center"
          onClick={onClick}
          sx={{ cursor: 'pointer' }}
        >
          <Typography fontFamily="IBM Plex Mono" fontSize={10}>{`${t('Current').toUpperCase()}:${'2.0'}x`}</Typography>
        </Box>
      </Box>
      <Box display="flex" justifyItems="space-between" alignItems="center" gap={2}>
        <Typography variant="h6">1x</Typography>
        <Slider
          value={input.leverageRatio}
          onChange={(_, value) => setLeverageRatio(value as number)}
          marks={currentMark}
          defaultValue={currentLeverageRatio}
          valueLabelDisplay="on"
          min={minLeverageRatio}
          max={maxLeverageRatio}
          step={0.1}
          valueLabelFormat={(value) => `${value.toFixed(1)}x`}
          disabled={!input.collateralSymbol || !input.borrowSymbol}
          sx={{
            height: 4,
            '& .MuiSlider-thumb': {
              bgcolor: 'green',
              width: 16,
              height: 16,
              '&:before': {
                boxShadow: 'none',
              },
              '&:hover, &.Mui-focusVisible, &.Mui-active': {
                boxShadow: 'none',
              },
            },
            '& .MuiSlider-valueLabel': {
              margin: '4px',
              fontSize: 12,
              fontWeight: 700,
              padding: '1px 4px',
              bgcolor: 'green',
              color: 'white',
            },
            '& .MuiSlider-mark': {
              backgroundColor: 'currentColor',
              height: '16px',
              width: '2px',
              borderRadius: '10px',
              '&.MuiSlider-markActive': {
                opacity: 1,
                backgroundColor: 'currentColor',
              },
            },
          }}
        />
        <Typography variant="h6">Max</Typography>
      </Box>
    </Box>
  );
};

export default MultiplierSlider;
