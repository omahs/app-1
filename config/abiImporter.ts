import kovanAuditor from 'protocol/deployments/kovan/Auditor.json';
import kovanFixedLenderDAI from 'protocol/deployments/kovan/FixedLenderDAI.json';
import kovanFixedLenderWETH from 'protocol/deployments/kovan/FixedLenderWETH.json';
import kovanPreviewer from 'protocol/deployments/kovan/Previewer.json';

import rinkebyAuditor from 'protocol/deployments/rinkeby/Auditor.json';
import rinkebyFixedLenderDAI from 'protocol/deployments/rinkeby/FixedLenderDAI.json';
import rinkebyFixedLenderWETH from 'protocol/deployments/rinkeby/FixedLenderWETH.json';
import rinkebyFixedLenderWBTC from 'protocol/deployments/rinkeby/FixedLenderWBTC.json';
import rinkebyFixedLenderUSDC from 'protocol/deployments/rinkeby/FixedLenderUSDC.json';
import rinkebyPreviewer from 'protocol/deployments/rinkeby/Previewer.json';

import { Dictionary } from 'types/Dictionary';

function getABI(network: string | undefined = 'rinkeby') {
  const dictionary: Dictionary<Dictionary<any>> = {
    kovan: {
      FixedLenderDAI: kovanFixedLenderDAI,
      FixedLenderWETH: kovanFixedLenderWETH,
      Auditor: kovanAuditor,
      Previewer: kovanPreviewer
    },
    rinkeby: {
      FixedLenderDAI: rinkebyFixedLenderDAI,
      FixedLenderWETH: rinkebyFixedLenderWETH,
      FixedLenderWBTC: rinkebyFixedLenderWBTC,
      FixedLenderUSDC: rinkebyFixedLenderUSDC,
      Auditor: rinkebyAuditor,
      Previewer: rinkebyPreviewer
    },
    mainnet: {}
  };

  return dictionary[network];
}

export default getABI;
