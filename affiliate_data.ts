export function getDataUrl(affiliateID: number): string {

  let data_url: string = '';

  switch (affiliateID) {
    case 5:
      data_url = 'https://raw.githubusercontent.com/bricewilson/Deno-Getting-Started/Using_the_Deno_Runtime_API/products.json';
  }

  return data_url;
}