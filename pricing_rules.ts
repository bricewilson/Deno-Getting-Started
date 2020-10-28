export function getThresholdPrice(affiliateID: number): number {
  switch (affiliateID) {
    case 1:
      return 100;
    case 2:
      return 50;
    default:
      return 40;
  }
}