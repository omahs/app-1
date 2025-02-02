import React from 'react';
import { Box, Typography } from '@mui/material';
import TwitterIcon from '@mui/icons-material/Twitter';
import GitHubIcon from '@mui/icons-material/GitHub';
import { globals } from 'styles/theme';
import SwitchTheme from 'components/SwitchTheme';
import { DiscordIcon } from 'components/Icons';
import { useTranslation } from 'react-i18next';
import SelectLanguage from 'components/SelectLanguage';
const { onlyDesktopFlex } = globals;

const Footer = () => {
  const { t } = useTranslation();
  const date = new Date();
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Box sx={{ width: '100%' }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: { xs: 'center', sm: 'space-between' },
            alignItems: 'center',
            padding: '16px 0px',
            color: 'figma.grey.300',
            fontWeight: '500',
          }}
        >
          <Typography fontSize="0.85em">© Exactly {date.getFullYear()}</Typography>
          <Box sx={{ display: onlyDesktopFlex, gap: 1.5, alignItems: 'center' }}>
            <Typography fontSize="0.85em">
              <a
                target="_blank"
                rel="noreferrer noopener"
                href="https://discord.com/channels/846682395553824808/908758791057719358"
              >
                {t('Give us feedback')}
              </a>
            </Typography>
            <Typography fontSize="0.85em">|</Typography>
            <Typography fontSize="0.85em">
              <a target="_blank" rel="noreferrer noopener" href="https://docs.exact.ly/security/audits">
                {t('Audits')}
              </a>
            </Typography>
            <Typography fontSize="0.85em">|</Typography>
            <Typography fontSize="0.85em">
              <a target="_blank" rel="noreferrer noopener" href="https://docs.exact.ly/">
                {t('Documentation')}
              </a>
            </Typography>
            <Typography fontSize="0.85em">|</Typography>
            <Typography fontSize="0.85em">
              <a target="_blank" rel="noreferrer noopener" href="https://dune.com/exactly/exactly">
                {t('Stats')}
              </a>
            </Typography>
            <a target="_blank" rel="noreferrer noopener" href="https://github.com/exactly">
              <GitHubIcon fontSize="small" />
            </a>
            <a target="_blank" rel="noreferrer noopener" href="https://twitter.com/exactlyprotocol">
              <TwitterIcon fontSize="small" />
            </a>
            <a target="_blank" rel="noreferrer noopener" href="https://discord.gg/exactly">
              <DiscordIcon fontSize="small" />
            </a>
            <SelectLanguage />
            <SwitchTheme />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Footer;
