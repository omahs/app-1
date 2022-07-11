function parseHealthFactor(debt: number, collateral: number) {
  //TODO => check case when the user doesn't have any collateral or debt

  if (collateral <= 0 || debt <= 0) {
    return '1x';
  } else {
    const healthFactor = collateral / debt;

    let decimals = 0;

    if (healthFactor < 10) {
      decimals = 2;
    }

    return `${healthFactor.toFixed(decimals)}x`;
  }
}
export default parseHealthFactor;
