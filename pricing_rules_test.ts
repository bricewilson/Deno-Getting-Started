import { getThresholdPrice } from './pricing_rules.ts';
import { assertEquals } from 'https://deno.land/std@0.78.0/testing/asserts.ts';

Deno.test('threshold for affiliate ID 5', () => {

  const price = getThresholdPrice(5);

  assertEquals(price, 40);
});