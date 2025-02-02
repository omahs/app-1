import * as modal from '../modal';
import * as navbar from '../navbar';
import * as dashboard from '../dashboard';
import { formatSymbol } from '../../utils/strings';
import { ERC20TokenSymbol } from '../../utils/contracts';

type TestParams = (
  | {
      type: 'floating';
      maturity?: number;
    }
  | {
      type: 'fixed';
      maturity: number;
    }
) & {
  symbol: ERC20TokenSymbol;
  amount?: string;
  shouldApprove?: boolean;
};

export default ({ type, symbol, amount = '1', shouldApprove = false, maturity }: TestParams) => {
  describe(`${symbol} ${type} repay`, () => {
    it('should be in the correct page', () => {
      cy.url().then((url) => {
        if (!url.includes('/dashboard')) {
          navbar.goTo('dashboard');
          dashboard.switchTab('borrow');
        }
      });
    });

    it('should open the modal', () => {
      modal.open(type, 'repay', symbol, maturity);
    });

    describe('the modal', () => {
      it('should have the correct descriptions', () => {
        modal.checkTitle('Repay');
        modal.checkType(type);
        modal.checkAssetSelection(symbol);

        if (type === 'fixed') {
          modal.checkPoolDate(maturity);
        }
      });
    });

    describe('the input', () => {
      afterEach(() => {
        modal.clearInput();
      });

      it(`should allow to input the amount ${amount}`, () => {
        modal.input(amount);
        modal.checkAlertNotFound('error');
      });
    });

    describe('the transaction', () => {
      it('should be successful', () => {
        modal.input(amount);

        if (shouldApprove) {
          modal.waitForApprove();
          modal.approve();
        }

        modal.waitForSubmit();

        modal.submit();
        modal.waitForTransaction('repay');

        modal.checkTransactionStatus('success', `You repayed ${amount} ${formatSymbol(symbol)}`);

        modal.close();
      });
    });
  });
};
