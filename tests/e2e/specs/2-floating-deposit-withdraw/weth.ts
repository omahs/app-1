import deposit from '../../steps/common/deposit';
import withdraw, { attemptWithdraw } from '../../steps/common/withdraw';
import { setup } from '../../steps/setup';

describe('WETH floating deposit/withdraw', () => {
  const { visit, setBalance, userAddress } = setup();

  before(() => {
    visit('/');
  });

  before(async () => {
    await setBalance(userAddress(), {
      ETH: 100,
    });
  });

  deposit({
    type: 'floating',
    symbol: 'WETH',
    decimals: 18,
    balance: '100',
    amount: '1',
  });

  attemptWithdraw({ type: 'floating', symbol: 'WETH', amount: '10' });

  withdraw({
    type: 'floating',
    symbol: 'WETH',
    amount: '0.5',
    shouldApprove: true,
  });
});
