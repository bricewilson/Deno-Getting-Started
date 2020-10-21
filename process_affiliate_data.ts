import { Product } from './product.ts';

const affiliateID: number = parseInt(Deno.args[0]);

const data_url: string = 'https://raw.githubusercontent.com/bricewilson/Deno-Getting-Started/Using_the_Deno_Runtime_API/products.json';

const response = await fetch(data_url);

const data = await response.json() as Product[];

const affiliate_products: Product[] = new Array<Product>();

data.forEach(product => {
  if(product.price > 40) {
    product.affiliateID = affiliateID;
    affiliate_products.push(product);
  }
});

Deno.writeTextFile('affiliate_products.json', JSON.stringify(affiliate_products, null, '  '));
