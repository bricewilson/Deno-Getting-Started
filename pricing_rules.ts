export function getThresholdPrice(affiliateID: any): number {
  switch (affiliateID) {
    case 1:
      return 100;
    case 2:
      return 50;
    default:
      return 40;
  }
  return 0;
};