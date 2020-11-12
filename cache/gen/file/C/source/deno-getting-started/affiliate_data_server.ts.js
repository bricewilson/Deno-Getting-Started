import { Application, Router, Status } from 'https://deno.land/x/oak@v6.3.1/mod.ts';
import * as log from "https://deno.land/std@0.77.0/log/mod.ts";
const productsJson = await Deno.readTextFile('affiliate_products.json');
const productsArray = JSON.parse(productsJson);
const router = new Router();
router
    .get('/products', (context) => {
    context.response.body = JSON.stringify(productsArray, null, '  ');
    log.info('Returning all products.');
})
    .get('/products/:id', (context) => {
    const requestedProduct = productsArray.find(p => p.productID == context.params.id);
    if (requestedProduct) {
        context.response.body = JSON.stringify(requestedProduct, null, '  ');
        log.info(`Returning product: ${requestedProduct.name}.`);
    }
    else {
        context.response.status = Status.NotFound;
        log.error(`Requested product ID ${context.params.id} not found.`);
    }
});
const app = new Application();
app.use(router.routes());
log.info('Listening for requests...');
await app.listen({ port: 8000 });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWZmaWxpYXRlX2RhdGFfc2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYWZmaWxpYXRlX2RhdGFfc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3BGLE9BQU8sS0FBSyxHQUFHLE1BQU0seUNBQXlDLENBQUM7QUFHL0QsTUFBTSxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLHlCQUF5QixDQUFDLENBQUM7QUFDeEUsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQWMsQ0FBQztBQUU1RCxNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBRSxDQUFDO0FBRTVCLE1BQU07S0FDSCxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsT0FBWSxFQUFFLEVBQUU7SUFDakMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2xFLEdBQUcsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQztBQUN0QyxDQUFDLENBQUM7S0FDRCxHQUFHLENBQUMsZUFBZSxFQUFFLENBQUMsT0FBWSxFQUFFLEVBQUU7SUFDckMsTUFBTSxnQkFBZ0IsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ25GLElBQUcsZ0JBQWdCLEVBQUU7UUFDbkIsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDckUsR0FBRyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsZ0JBQWdCLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQztLQUMxRDtTQUNJO1FBQ0gsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUMxQyxHQUFHLENBQUMsS0FBSyxDQUFDLHdCQUF3QixPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7S0FDbkU7QUFDSCxDQUFDLENBQUMsQ0FBQztBQUVILE1BQU0sR0FBRyxHQUFHLElBQUksV0FBVyxFQUFFLENBQUM7QUFDOUIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUV6QixHQUFHLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUM7QUFFdEMsTUFBTSxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMifQ==