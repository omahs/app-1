import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { WeiPerEther, Zero } from '@ethersproject/constants';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { BigNumber, formatFixed, parseFixed } from '@ethersproject/bignumber';
import { splitSignature } from '@ethersproject/bytes';
import { useSignTypedData } from 'wagmi';
import dayjs from 'dayjs';

import { ModalBox, ModalBoxRow } from 'components/common/modal/ModalBox';
import ModalAdvancedSettings from 'components/common/modal/ModalAdvancedSettings';
import ModalSheet from 'components/common/modal/ModalSheet';
import CustomSlider from 'components/common/CustomSlider';
import useAccountData from 'hooks/useAccountData';
import { useDebtManagerContext } from 'contexts/DebtManagerContext';
import parseTimestamp from 'utils/parseTimestamp';
import ModalSheetButton from 'components/common/modal/ModalSheetButton';
import formatNumber from 'utils/formatNumber';
import usePreviewer from 'hooks/usePreviewer';
import useGraphClient from 'hooks/useGraphClient';
import useDelayedEffect from 'hooks/useDelayedEffect';
import PositionTable, { PositionTableRow } from '../PositionTable';
import { useWeb3 } from 'hooks/useWeb3';
import Overview from '../Overview';
import { calculateAPR } from 'utils/calculateAPR';
import { Borrow } from 'types/Borrow';
import { Contract, PopulatedTransaction } from '@ethersproject/contracts';

import getAllBorrowsAtMaturity from 'queries/getAllBorrowsAtMaturity';
import ModalInfoEditableSlippage from 'components/OperationsModal/Info/ModalInfoEditableSlippage';
import handleOperationError from 'utils/handleOperationError';
import ModalAlert from 'components/common/modal/ModalAlert';
import useRewards from 'hooks/useRewards';
import LoadingTransaction from '../Loading';
import { gasLimitMultiplier } from 'utils/const';
import OperationSquare from 'components/common/OperationSquare';
import Submit from '../Submit';
import useContract from 'hooks/useContract';
import useIsContract from 'hooks/useIsContract';

import { Permit } from './types';
import { PermitStruct } from 'types/contracts/DebtManager';

function Operation() {
  const { t } = useTranslation();
  const { accountData, getMarketAccount } = useAccountData();
  const { walletAddress, chain } = useWeb3();
  const { signTypedDataAsync } = useSignTypedData();
  const proxyAdmin = useContract<Contract>('ProxyAdmin')?.address;

  const [[fromSheetOpen, toSheetOpen], setSheetOpen] = useState([false, false]);
  const container = useRef<HTMLDivElement>(null);
  const fromSheetRef = useRef<HTMLDivElement>(null);
  const toSheetRef = useRef<HTMLDivElement>(null);

  const { rates } = useRewards();
  const isContract = useIsContract();

  const request = useGraphClient();

  const {
    tx,
    input,
    setFrom,
    setTo,
    setPercent,
    setSlippage,
    debtManager,
    market: marketContract,
    errorData,
    setErrorData,
    isLoading,
    needsApproval,
    approve,
    submit,
  } = useDebtManagerContext();

  const onClose = useCallback(() => setSheetOpen([false, false]), []);

  const previewerContract = usePreviewer();

  const [fromRows, setFromRows] = useState<PositionTableRow[]>([]);
  const [toRows, setToRows] = useState<PositionTableRow[]>([]);

  const updateFromRows = useCallback(async () => {
    if (!accountData || !walletAddress) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await request<any>(getAllBorrowsAtMaturity(walletAddress));
    if (!data) return;

    const borrows: Borrow[] = data.borrowAtMaturities.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ({ id, market, maturity, receiver, borrower, assets, fee, timestamp }: any): Borrow => ({
        id,
        market,
        maturity: parseFloat(maturity),
        assets: parseFixed(assets),
        fee: parseFixed(fee),
        receiver,
        borrower,
        timestamp,
      }),
    );

    const apr = (symbol: string, market: string, maturity: number): BigNumber => {
      const marketAccount = getMarketAccount(symbol);
      if (!marketAccount) return Zero;

      const filtered = borrows.filter(
        (borrow) => borrow.market.toLowerCase() === market.toLowerCase() && borrow.maturity === maturity,
      );

      const [allProportionalAssets, allAssets] = filtered.reduce(
        ([aprAmounts, assets], borrow) => {
          const transactionAPR = calculateAPR(borrow.fee, borrow.assets, borrow.timestamp, borrow.maturity);
          const proportionalAssets = transactionAPR.mul(borrow.assets).div(WeiPerEther);

          return [aprAmounts.add(proportionalAssets), assets.add(borrow.assets)];
        },
        [Zero, Zero],
      );

      if (allAssets.isZero()) return Zero;

      return allProportionalAssets.mul(WeiPerEther).div(allAssets);
    };

    setFromRows(
      accountData.flatMap((entry) => {
        const {
          assetSymbol,
          market,
          decimals,
          usdPrice,
          floatingBorrowRate,
          floatingBorrowAssets,
          fixedBorrowPositions,
        } = entry;
        return [
          ...(entry.floatingBorrowAssets.gt(Zero)
            ? [
                {
                  symbol: assetSymbol,
                  balance: floatingBorrowAssets,
                  apr: floatingBorrowRate,
                  usdPrice,
                  decimals,
                },
              ]
            : []),
          ...fixedBorrowPositions.map((position) => ({
            symbol: assetSymbol,
            maturity: Number(position.maturity),
            balance: position.previewValue,
            usdPrice,
            decimals,
            apr: apr(assetSymbol, market, Number(position.maturity)),
          })),
        ];
      }),
    );
  }, [accountData, walletAddress, request, getMarketAccount]);

  useEffect(() => {
    updateFromRows();
  }, [updateFromRows]);

  const updateToRows = useCallback(
    async (cancelled: () => boolean) => {
      if (!previewerContract || !input.from) return;

      const marketAccount = getMarketAccount(input.from.symbol);
      if (!marketAccount) return;

      const { floatingBorrowRate, usdPrice, assetSymbol, decimals } = marketAccount;

      const fromRow = fromRows.find((r) => r.symbol === assetSymbol && r.maturity === input.from?.maturity);
      if (!fromRow) {
        return;
      }

      const initialAssets = fromRow.balance?.mul(input.percent).div(100);
      if (!initialAssets) {
        return;
      }

      try {
        const previewPools = await previewerContract.previewBorrowAtAllMaturities(marketAccount.market, initialAssets);
        const currentTimestamp = dayjs().unix();

        const rewards = rates[assetSymbol];
        const fixedOptions: PositionTableRow[] = previewPools.map(({ maturity, assets }) => {
          const rate = assets.mul(WeiPerEther).div(initialAssets);
          const fixedAPR = rate.sub(WeiPerEther).mul(31_536_000).div(maturity.sub(currentTimestamp));
          const fee = assets.sub(initialAssets);

          return {
            symbol: assetSymbol,
            maturity: Number(maturity),
            usdPrice: usdPrice,
            balance: assets,
            fee: fee.isNegative() ? Zero : fee,
            decimals,
            apr: fixedAPR,
            rewards,
          };
        });

        const fromMaturity = input.from.maturity;
        const options: PositionTableRow[] = [
          {
            symbol: assetSymbol,
            apr: floatingBorrowRate,
            usdPrice,
            decimals,
            rewards,
          },
          ...fixedOptions,
        ].filter((opt) => opt.maturity !== fromMaturity);

        const bestAPR = Math.min(...options.map((opt) => Number(opt.apr) / 1e18));
        const bestOption = [...options].reverse().find((opt) => Number(opt.apr) / 1e18 === bestAPR);

        if (cancelled()) return;

        setToRows(
          options.map((opt) => ({
            ...opt,
            isBest: opt?.maturity === bestOption?.maturity,
          })),
        );
      } catch (error) {
        if (cancelled()) return;
        setToRows([]);
      }
    },
    [previewerContract, input.from, input.percent, getMarketAccount, fromRows, rates],
  );

  const { isLoading: loadingToRows } = useDelayedEffect({ effect: updateToRows });

  const usdAmount = useMemo(() => {
    const row = fromRows.find((r) => r.symbol === input.from?.symbol && r.maturity === input.from?.maturity);
    if (!row) {
      return '';
    }

    return formatNumber(
      formatFixed(row.balance?.mul(row.usdPrice).div(WeiPerEther).mul(input.percent).div(100) || Zero, row.decimals),
      'USD',
      true,
    );
  }, [input.from, input.percent, fromRows]);

  const [fromRow, toRow] = useMemo<[PositionTableRow | undefined, PositionTableRow | undefined]>(
    () => [
      fromRows.find((row) => input.from?.symbol === row.symbol && input.from?.maturity === row.maturity),
      toRows.find((row) => input.to?.symbol === row.symbol && input.to?.maturity === row.maturity),
    ],
    [input.from, input.to, fromRows, toRows],
  );

  const [maxRepayAssets, maxBorrowAssets] = useMemo(() => {
    const raw = input.slippage || '0';
    const slippage = WeiPerEther.add(parseFixed(raw, 18).div(100));

    const ret: [BigNumber, BigNumber] = [Zero, Zero];
    if (!fromRow || !toRow) {
      return ret;
    }

    const fromBalance = fromRow.balance?.mul(input.percent).div(100) ?? Zero;

    if (fromRow.maturity) {
      ret[0] = fromBalance.mul(slippage).div(WeiPerEther);
    } else {
      ret[0] = fromBalance;
    }

    if (toRow.maturity) {
      ret[1] = toRow.balance?.mul(slippage).div(WeiPerEther) ?? Zero;
    } else {
      ret[1] = fromBalance;
    }

    return ret;
  }, [input.slippage, input.percent, fromRow, toRow]);

  const [requiresApproval, setRequiresApproval] = useState(false);

  const populateTransaction = useCallback(async (): Promise<PopulatedTransaction | undefined> => {
    if (!walletAddress || !debtManager || !marketContract || !proxyAdmin || !input.from || !input.to) {
      return;
    }

    const percentage = BigNumber.from(input.percent).mul(WeiPerEther).div(100);

    if (await isContract(walletAddress)) {
      if (input.from.maturity && input.to.maturity) {
        const args = [
          marketContract.address,
          input.from.maturity,
          input.to.maturity,
          maxRepayAssets,
          maxBorrowAssets,
          percentage,
        ] as const;
        const gasLimit = await debtManager.estimateGas['rollFixed(address,uint256,uint256,uint256,uint256,uint256)'](
          ...args,
        );
        return debtManager.populateTransaction['rollFixed(address,uint256,uint256,uint256,uint256,uint256)'](...args, {
          gasLimit: gasLimit.mul(gasLimitMultiplier).div(WeiPerEther),
        });
      } else if (input.to.maturity) {
        const args = [marketContract.address, input.to.maturity, maxBorrowAssets, percentage] as const;
        const gasLimit = await debtManager.estimateGas['rollFloatingToFixed(address,uint256,uint256,uint256)'](...args);
        return debtManager.populateTransaction['rollFloatingToFixed(address,uint256,uint256,uint256)'](...args, {
          gasLimit: gasLimit.mul(gasLimitMultiplier).div(WeiPerEther),
        });
      } else if (input.from.maturity) {
        const args = [marketContract.address, input.from.maturity, maxRepayAssets, percentage] as const;
        const gasLimit = await debtManager.estimateGas['rollFixedToFloating(address,uint256,uint256,uint256)'](...args);
        return debtManager.populateTransaction['rollFixedToFloating(address,uint256,uint256,uint256)'](...args, {
          gasLimit: gasLimit.mul(gasLimitMultiplier).div(WeiPerEther),
        });
      } else return;
    }

    const [marketImpl, marketNonce] = await Promise.all([
      marketContract.connect(marketContract.provider).callStatic.implementation({ from: proxyAdmin }),
      marketContract.nonces(walletAddress),
    ]);

    const deadline = BigNumber.from(dayjs().unix() + 3_600);

    const { v, r, s } = await signTypedDataAsync({
      domain: {
        name: '',
        version: '1',
        chainId: chain.id,
        verifyingContract: marketImpl as `0x${string}`,
      },
      types: { Permit },
      value: {
        owner: walletAddress,
        spender: debtManager.address as `0x${string}`,
        value: input.from.maturity && !input.to.maturity ? maxRepayAssets : maxBorrowAssets,
        nonce: marketNonce,
        deadline,
      },
    }).then(splitSignature);

    const permit: PermitStruct = {
      account: walletAddress,
      deadline,
      ...{ v, r, s },
    };

    if (input.from.maturity && input.to.maturity) {
      const args = [
        marketContract.address,
        BigNumber.from(input.from.maturity),
        BigNumber.from(input.to.maturity),
        maxRepayAssets,
        maxBorrowAssets,
        percentage,
        permit,
      ] as const;
      const gasLimit = await debtManager.estimateGas[
        'rollFixed(address,uint256,uint256,uint256,uint256,uint256,(address,uint256,uint8,bytes32,bytes32))'
      ](...args);
      return debtManager.populateTransaction[
        'rollFixed(address,uint256,uint256,uint256,uint256,uint256,(address,uint256,uint8,bytes32,bytes32))'
      ](...args, {
        gasLimit: gasLimit.mul(gasLimitMultiplier).div(WeiPerEther),
      });
    } else if (input.to.maturity) {
      const args = [
        marketContract.address,
        BigNumber.from(input.to.maturity),
        maxBorrowAssets,
        percentage,
        permit,
      ] as const;
      const gasLimit = await debtManager.estimateGas[
        'rollFloatingToFixed(address,uint256,uint256,uint256,(address,uint256,uint8,bytes32,bytes32))'
      ](...args);
      return debtManager.populateTransaction[
        'rollFloatingToFixed(address,uint256,uint256,uint256,(address,uint256,uint8,bytes32,bytes32))'
      ](...args, {
        gasLimit: gasLimit.mul(gasLimitMultiplier).div(WeiPerEther),
      });
    } else if (input.from.maturity) {
      const args = [
        marketContract.address,
        BigNumber.from(input.from.maturity),
        maxRepayAssets,
        percentage,
        permit,
      ] as const;
      const gasLimit = await debtManager.estimateGas[
        'rollFixedToFloating(address,uint256,uint256,uint256,(address,uint256,uint8,bytes32,bytes32))'
      ](...args);
      return debtManager.populateTransaction[
        'rollFixedToFloating(address,uint256,uint256,uint256,(address,uint256,uint8,bytes32,bytes32))'
      ](...args, {
        gasLimit: gasLimit.mul(gasLimitMultiplier).div(WeiPerEther),
      });
    }
  }, [
    chain.id,
    debtManager,
    input.from,
    input.percent,
    input.to,
    isContract,
    marketContract,
    maxBorrowAssets,
    maxRepayAssets,
    proxyAdmin,
    signTypedDataAsync,
    walletAddress,
  ]);

  const load = useCallback(async () => {
    try {
      setErrorData(undefined);
      if (!input.from || !input.to) return;
      setRequiresApproval(await needsApproval(maxBorrowAssets));
    } catch (e: unknown) {
      setErrorData({ status: true, message: handleOperationError(e) });
    }
  }, [input.from, input.to, maxBorrowAssets, needsApproval, setErrorData]);

  const { isLoading: loadingStatus } = useDelayedEffect({ effect: load });

  const rollover = useCallback(() => submit(populateTransaction), [populateTransaction, submit]);

  const approveRollover = useCallback(async () => {
    await approve(maxBorrowAssets);
    setRequiresApproval(await needsApproval(maxBorrowAssets));
  }, [needsApproval, approve, maxBorrowAssets]);

  if (tx && input.to) return <LoadingTransaction tx={tx} to={input.to} />;

  return (
    <>
      <ModalSheet
        ref={fromSheetRef}
        container={container.current}
        open={fromSheetOpen}
        onClose={onClose}
        title={t('Select Current Debt')}
      >
        <PositionTable
          loading={fromRows.length === 0}
          data={fromRows}
          showBalance
          onClick={({ symbol, maturity }) => {
            setFrom({ symbol, maturity });
            setSheetOpen([false, false]);
          }}
        />
      </ModalSheet>
      <ModalSheet
        ref={toSheetRef}
        container={container.current}
        open={toSheetOpen}
        onClose={onClose}
        title={t('Select New Debt')}
      >
        <Box display="flex" justifyContent="space-between">
          <Typography variant="caption" color="figma.grey.600">
            {t('Amount To Rollover')}
          </Typography>
          <Typography variant="caption" color="figma.grey.600">
            ${usdAmount}
          </Typography>
        </Box>
        <CustomSlider pt={2} value={input.percent} onChange={setPercent} mb={4} />
        <PositionTable
          loading={loadingToRows}
          data={toRows}
          onClick={({ symbol, maturity }) => {
            setTo({ symbol, maturity });
            setSheetOpen([false, false]);
          }}
        />
      </ModalSheet>
      <Box
        ref={container}
        sx={{
          height: fromSheetOpen
            ? fromSheetRef.current?.clientHeight
            : toSheetOpen
            ? toSheetRef.current?.clientHeight
            : 'auto',
        }}
      >
        <ModalBox sx={{ p: 2 }}>
          <ModalBoxRow>
            <Grid container mb={1.5}>
              <Grid item xs={7}>
                <Typography variant="caption" color="figma.grey.600">
                  {t('From')}
                </Typography>
              </Grid>
              <Grid item xs={5}>
                <Typography variant="caption" color="figma.grey.600">
                  {t('To')}
                </Typography>
              </Grid>
            </Grid>
            <Grid container>
              <Grid item xs={5}>
                <ModalSheetButton
                  selected={Boolean(input.from)}
                  onClick={() => setSheetOpen([true, false])}
                  sx={{ ml: -0.5 }}
                >
                  {input.from ? (
                    <>
                      <OperationSquare type={input.from.maturity ? 'fixed' : 'floating'} />
                      {input.from.maturity ? t('Fixed') : t('Variable')}
                    </>
                  ) : (
                    t('Current debt')
                  )}
                </ModalSheetButton>
                <Typography component="div" variant="subtitle1" color="figma.grey.500">
                  {input.from
                    ? input.from.maturity
                      ? parseTimestamp(input.from.maturity)
                      : t('Open-ended')
                    : t('Maturity')}
                </Typography>
              </Grid>
              <Grid display="flex" alignItems="center" justifyContent="center" item xs={2}>
                <ArrowForwardRoundedIcon sx={{ color: 'blue', fontSize: 14, fontWeight: 600 }} />
              </Grid>
              <Grid item xs={5}>
                <ModalSheetButton
                  selected={Boolean(input.to)}
                  onClick={() => {
                    if (input.from) {
                      setFrom(input.from);
                    }
                    setSheetOpen([false, true]);
                  }}
                  disabled={!input.from}
                  sx={{ ml: -0.5, mr: -0.5 }}
                >
                  {input.to ? (
                    <>
                      <OperationSquare type={input.to.maturity ? 'fixed' : 'floating'} />
                      {input.to.maturity ? t('Fixed') : t('Variable')}
                    </>
                  ) : (
                    t('New debt')
                  )}
                </ModalSheetButton>
                <Typography component="div" variant="subtitle1" color="figma.grey.500">
                  {input.to ? (input.to.maturity ? parseTimestamp(input.to.maturity) : t('Open-ended')) : t('Maturity')}
                </Typography>
              </Grid>
            </Grid>
          </ModalBoxRow>
        </ModalBox>
        {fromRow && (
          <ModalBox sx={{ mt: 1, p: 2, backgroundColor: 'grey.100' }}>
            <Overview from={fromRow} to={toRow} percent={input.percent} />
          </ModalBox>
        )}

        <Box sx={{ mt: 4, mb: 4 }}>
          <ModalAdvancedSettings mt={-1}>
            <ModalInfoEditableSlippage value={input.slippage} onChange={(e) => setSlippage(e.target.value)} />
          </ModalAdvancedSettings>
        </Box>
        {errorData?.status && <ModalAlert message={errorData.message} variant={errorData.variant} />}
        <Submit
          disabled={!input.from || !input.to || errorData?.status}
          loading={loadingStatus || isLoading}
          onClick={requiresApproval ? approveRollover : rollover}
          variant="contained"
          fullWidth
        >
          {requiresApproval ? t('Approve') : t('Refinance your loan')}
        </Submit>
      </Box>
    </>
  );
}

export default React.memo(Operation);
