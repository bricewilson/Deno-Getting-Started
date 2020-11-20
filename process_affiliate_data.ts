import { Product } from './product.ts';
import { getDataUrl, getThresholdPrice } from './deps.ts';

// import { getDataUrl } from 'data_sources';
// import { getThresholdPrice } from 'prices';
// import { getDataUrl } from 'https://raw.githubusercontent.com/bricewilson/Deno-Getting-Started/Linking_to_External_Code/affiliate_data.ts';
// import { getThresholdPrice } from 'https://raw.githubusercontent.com/bricewilson/Deno-Getting-Started/Linking_to_External_Code/pricing_rules.ts';

export async function processData() {
  const affiliateID: number = parseInt(Deno.args[0]);

  const data_url: string = getDataUrl(affiliateID);
  
  const response = await fetch(data_url);
  
  const data = await response.json() as Product[];
  
  const affiliate_products: Product[] = new Array<Product>();
  
  const threshold_price: number = getThresholdPrice(affiliateID);
  
  data.forEach(product => {
    if(product.price > threshold_price) {
      product.affiliateID = affiliateID;
      affiliate_products.push(product);
    }
  });
  
  Deno.writeTextFile('affiliate_products.json', JSON.stringify(affiliate_products, null, '  '));
  
}

if (import.meta.main) {
  processData();
}