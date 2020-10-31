import { getDataUrl, getThresholdPrice } from './deps.ts';
const affiliateID = parseInt(Deno.args[0]);
const data_url = getDataUrl(affiliateID);
const response = await fetch(data_url);
const data = await response.json();
const affiliate_products = new Array();
const threshold_price = getThresholdPrice(affiliateID);
data.forEach(product => {
    if (product.price > threshold_price) {
        product.affiliateID = affiliateID;
        affiliate_products.push(product);
    }
});
Deno.writeTextFile('affiliate_products.json', JSON.stringify(affiliate_products, null, '  '));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc19hZmZpbGlhdGVfZGF0YS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInByb2Nlc3NfYWZmaWxpYXRlX2RhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQVExRCxNQUFNLFdBQVcsR0FBVyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRW5ELE1BQU0sUUFBUSxHQUFXLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUVqRCxNQUFNLFFBQVEsR0FBRyxNQUFNLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUV2QyxNQUFNLElBQUksR0FBRyxNQUFNLFFBQVEsQ0FBQyxJQUFJLEVBQWUsQ0FBQztBQUVoRCxNQUFNLGtCQUFrQixHQUFjLElBQUksS0FBSyxFQUFXLENBQUM7QUFFM0QsTUFBTSxlQUFlLEdBQVcsaUJBQWlCLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFL0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtJQUNyQixJQUFHLE9BQU8sQ0FBQyxLQUFLLEdBQUcsZUFBZSxFQUFFO1FBQ2xDLE9BQU8sQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBQ2xDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztLQUNsQztBQUNILENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLGFBQWEsQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLGtCQUFrQixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDIn0=