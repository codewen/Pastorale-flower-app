const assert = require('node:assert/strict');
const { test } = require('node:test');
const crypto = require('node:crypto');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createLoader, root } = require('./load-typescript.cjs');
const load = createLoader();
const { parseCsvDeliveryDate, parseShopifyDeliveryDate, parseShopifyDeliveryDateWithDefaultTime, sydneyDateTimeInput } = load('lib/order-date.ts');
const { mapShopifyOrder } = load('lib/shopify/order-mapper.ts');

function order(overrides = {}) {
  return {
    id: 'gid://shopify/Order/test', name: '#test', createdAt: '2026-09-20T01:00:00Z',
    displayFinancialStatus: 'PAID', displayFulfillmentStatus: 'UNFULFILLED',
    subtotalPriceSet: { shopMoney: { amount: '100.00' } },
    currentTotalPriceSet: { shopMoney: { amount: '135.00' } },
    currentShippingPriceSet: { shopMoney: { amount: '35.00' } },
    customer: null, shippingAddress: null, note: null,
    customAttributes: [{ key: 'delivery', value: 'delivery' }, { key: 'date', value: '25/09/2026' }],
    lineItems: { nodes: [{ title: 'Bouquet', quantity: 1, image: null, customAttributes: [], variant: null }] },
    shippingLines: { nodes: [{ title: 'Local Delivery' }] }, ...overrides,
  };
}

// Observed in Shopify Admin on 2026-09-24. These are reconstructed, anonymized
// fixtures, not raw GraphQL responses. Only amounts and scheduling attributes
// below come from those orders; customer/card/address data is not retained.
const observedSamples = [
  { name: '#7383', subtotal: '250.00', shipping: '15.00', date: '25/09/2026' },
  { name: '#7377', subtotal: '100.00', shipping: '25.00', date: '24/09/2026' },
  { name: '#7344', subtotal: '120.00', shipping: '35.00', date: '21/09/2026' },
  { name: '#7381', subtotal: '70.00', shipping: '0.00', date: '24/09/2026', pickup: '16:00 - 17:00' },
];

for (const sample of observedSamples) {
  test(`observed Shopify order ${sample.name}: shipping ${sample.shipping} and schedule`, () => {
    const mapped = mapShopifyOrder(order({
      name: sample.name,
      subtotalPriceSet: { shopMoney: { amount: sample.subtotal } },
      currentShippingPriceSet: { shopMoney: { amount: sample.shipping } },
      customAttributes: [
        { key: 'delivery', value: sample.pickup ? 'pickup' : 'delivery' },
        { key: 'date', value: sample.date },
        ...(sample.pickup ? [{ key: 'pickUpTime', value: sample.pickup }] : []),
      ],
      shippingLines: { nodes: [{ title: sample.pickup ? 'Store Pickup' : 'Local Delivery' }] },
    }));
    assert.equal(mapped.price, Number(sample.subtotal));
    if (sample.pickup) {
      assert.equal(mapped.pickup_delivery, 'Pickup');
      assert.equal(mapped.delivery_date_time, '2026-09-24T06:00:00.000Z');
      assert.doesNotMatch(mapped.details, /Delivery Fee/);
    } else {
      assert.match(mapped.details, new RegExp(`Delivery Fee: ${Number(sample.shipping)}(?:\\n|$)`));
      assert.equal(mapped.delivery_date_time, {
        '25/09/2026': '2026-09-25T03:00:00.000Z',
        '24/09/2026': '2026-09-24T03:00:00.000Z',
        '21/09/2026': '2026-09-21T03:00:00.000Z',
      }[sample.date]);
      assert.doesNotMatch(mapped.details, /Requested date:/);
    }
  });
}

test('zero merchandise and shipping amounts remain zero; invalid subtotals remain unknown', () => {
  for (const amount of ['0.00', '12.50', '15.00', '25.00', '35.00']) {
    const mapped = mapShopifyOrder(order({
      subtotalPriceSet: { shopMoney: { amount: '0.00' } },
      currentShippingPriceSet: { shopMoney: { amount } },
    }));
    assert.equal(mapped.price, 0);
    assert.ok(mapped.details.includes(`Delivery Fee: ${Number(amount)}`));
  }
  for (const subtotal of [null, { shopMoney: { amount: '' } }, { shopMoney: { amount: 'invalid' } }]) {
    assert.equal(mapShopifyOrder(order({ subtotalPriceSet: subtotal })).price, null);
  }
});

test('line-item flower colour is retained in the synced order details', () => {
  const mapped = mapShopifyOrder(order({
    lineItems: {
      nodes: [{
        title: 'Rose Bouquet', quantity: 1, image: null, variant: null,
        customAttributes: [
          { key: 'Flower Colour', value: 'Blush Pink' },
          { key: '_internal', value: 'do not show' },
        ],
      }],
    },
  }));
  assert.match(mapped.details, /Rose Bouquet\nFlower Colour: Blush Pink/);
  assert.doesNotMatch(mapped.details, /internal/);
});

test('CSV uses Sydney winter and summer offsets, including midnight and seconds', () => {
  assert.equal(parseCsvDeliveryDate('7/15/2026 10:00 AM'), '2026-07-15T00:00:00.000Z');
  assert.equal(parseCsvDeliveryDate('1/15/2026 10:00 AM'), '2026-01-14T23:00:00.000Z');
  assert.equal(parseCsvDeliveryDate('2/03/2026 9:34PM'), '2026-02-03T10:34:00.000Z');
  assert.equal(parseCsvDeliveryDate('2026-07-15 00:00:30'), '2026-07-14T14:00:30.000Z');
  assert.equal(parseCsvDeliveryDate('7/15/2026 12:00 PM'), '2026-07-15T02:00:00.000Z');
  assert.equal(parseCsvDeliveryDate('7/15/2026 12:00 AM'), '2026-07-14T14:00:00.000Z');
});

test('DST transition instants round-trip; nonexistent and ambiguous local times are rejected', () => {
  assert.equal(parseShopifyDeliveryDate('04/10/2026', '01:30'), '2026-10-03T15:30:00.000Z');
  assert.equal(parseShopifyDeliveryDate('04/10/2026', '03:30'), '2026-10-03T16:30:00.000Z');
  assert.equal(parseShopifyDeliveryDate('05/04/2026', '01:30'), '2026-04-04T14:30:00.000Z');
  assert.equal(parseShopifyDeliveryDate('05/04/2026', '03:30'), '2026-04-04T17:30:00.000Z');
  assert.equal(parseShopifyDeliveryDate('04/10/2026', '02:30'), null);
  assert.equal(parseShopifyDeliveryDate('05/04/2026', '02:30'), null);
});

test('missing/invalid Shopify schedules never fall back to 13:00 or creation date', () => {
  for (const [date, time] of [
    [undefined, '10am'], ['25/09/2026', undefined], ['2026-02-30', '10am'],
    ['31/04/2026', '10am'], ['29/02/2026', '10am'], ['25/09/2026', '13pm'],
    ['25/09/2026', '24:00'], ['25/09/2026', '10:99'], ['25/09/2026', 'by 10am please'],
  ]) assert.equal(parseShopifyDeliveryDate(date, time), null);
  assert.equal(parseShopifyDeliveryDate('29/02/2028', '10am'), '2028-02-28T23:00:00.000Z');
  assert.equal(parseShopifyDeliveryDate('2026-09-25', '10am – 11am'), '2026-09-25T00:00:00.000Z');
  const mapped = mapShopifyOrder(order({ customAttributes: [] }));
  assert.equal(mapped.delivery_date_time, null);
});

test('delivery dates default to 1pm weekdays and 11am Saturdays', () => {
  assert.equal(parseShopifyDeliveryDateWithDefaultTime('29/10/2026'), '2026-10-29T02:00:00.000Z');
  assert.equal(parseShopifyDeliveryDateWithDefaultTime('31/10/2026'), '2026-10-31T00:00:00.000Z');
  assert.equal(parseShopifyDeliveryDateWithDefaultTime('01/11/2026'), null);
});

test('delivery mapping ignores cart pickup time when checkout changes to delivery', () => {
  const mapped = mapShopifyOrder(order({ customAttributes: [
    { key: 'delivery', value: 'delivery' },
    { key: 'date', value: '29/10/2026' },
    { key: 'pickUpTime', value: '10:00 - 11:00' },
  ] }));
  assert.equal(mapped.pickup_delivery, 'Delivery');
  assert.equal(mapped.delivery_date_time, '2026-10-29T02:00:00.000Z');
});

test('checkout fulfilment method overrides stale cart delivery attributes', () => {
  const delivery = mapShopifyOrder(order({ customAttributes: [
    { key: 'delivery', value: 'pickup' },
    { key: 'date', value: '29/10/2026' },
    { key: 'pickUpTime', value: '10:00 - 11:00' },
  ], shippingLines: { nodes: [{ title: 'Local Delivery' }] } }));
  assert.equal(delivery.pickup_delivery, 'Delivery');
  assert.equal(delivery.delivery_date_time, '2026-10-29T02:00:00.000Z');

  const pickup = mapShopifyOrder(order({ customAttributes: [
    { key: 'delivery', value: 'delivery' },
    { key: 'date', value: '29/10/2026' },
    { key: 'pickUpTime', value: '10:00 - 11:00' },
  ], shippingLines: { nodes: [{ title: 'Store Pickup' }] } }));
  assert.equal(pickup.pickup_delivery, 'Pickup');
  assert.equal(pickup.delivery_date_time, '2026-10-28T23:00:00.000Z');
});

test('CSV rejects missing dates, invalid dates and DST ambiguity', () => {
  for (const value of ['', '7/15/2026', '2/30/2026 10:00', '13/01/2026 10:00', '7/15/2026 13pm', '10/04/2026 02:30', '4/05/2026 02:30']) {
    assert.throws(() => parseCsvDeliveryDate(value), /delivery date\/time/);
  }
});

test('review time input supports null and uses Sydney independent of device timezone', () => {
  assert.equal(sydneyDateTimeInput(null), '');
  assert.equal(sydneyDateTimeInput('invalid'), '');
  assert.equal(sydneyDateTimeInput('2026-07-15T00:00:00Z'), '2026-07-15T10:00');
  assert.equal(sydneyDateTimeInput('2026-01-14T23:00:00Z'), '2026-01-15T10:00');
});

test('zero price renders as 0 in the real edit form', () => {
  const { OrderForm } = load('components/OrderForm.tsx');
  const markup = renderToStaticMarkup(React.createElement(OrderForm, {
    initialData: { price: 0 }, onSubmit: async () => {}, onCancel: () => {},
  }));
  assert.match(markup, /<input[^>]*id="price"[^>]*value="0"/);
});

test('saving a zero-dollar order preserves zero', async () => {
  const isolated = createLoader({ react: {
    ...React, useState: (initial) => [initial, () => {}], useEffect: () => {},
  } });
  const { OrderForm } = isolated('components/OrderForm.tsx');
  let submitted;
  const form = OrderForm({ initialData: { price: 0 }, onSubmit: async (data) => { submitted = data; }, onCancel: () => {} });
  await form.props.onSubmit({ preventDefault() {} });
  assert.equal(submitted.price, 0);
});

test('CSV import saves correct Sydney timestamps and zero price, and rejects invalid rows', async () => {
  const inserted = [];
  const supabase = { from: () => ({ insert: async (values) => { inserted.push(values); return { error: null }; } }) };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test';
    const { importOrdersFromCSV } = createLoader({ '@supabase/supabase-js': { createClient: () => supabase } })('lib/import-orders.ts');
    const row = { order_id: 'csv-test', customer_id: 'test', photos: '', price: '0.00', delivery_date_time: '7/15/2026 10:00 AM' };
    await importOrdersFromCSV([row]);
    assert.equal(inserted[0].delivery_date_time, '2026-07-15T00:00:00.000Z');
    assert.equal(inserted[0].price, 0);
    await assert.rejects(importOrdersFromCSV([{ ...row, delivery_date_time: '' }]), /delivery date\/time/);
    assert.equal(inserted.length, 1);
  } finally {
    if (url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = url;
    if (key === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = key;
  }
});

test('approval refuses an unconfirmed timestamp before touching the database', async () => {
  const isolated = createLoader({ [`${root}/lib/supabase/client.ts`]: {
    supabase: { from() { throw new Error('Unexpected database access'); } },
  } });
  const { approveShopifyStagedOrder } = isolated('lib/supabase/shopify-orders.ts');
  await assert.rejects(approveShopifyStagedOrder({ delivery_date_time: null }), /Confirm a valid/);
  await assert.rejects(approveShopifyStagedOrder({ delivery_date_time: 'invalid' }), /Confirm a valid/);
});

test('confirmed review order imports the chosen timestamp and zero price', async () => {
  let inserted;
  let reviewed;
  const supabase = { from(table) {
    if (table === 'orders') return { insert(values) {
      inserted = values;
      return { select: () => ({ single: async () => ({ data: { id: 'daily-test', ...values }, error: null }) }) };
    } };
    assert.equal(table, 'shopify_orders');
    return { update(values) { reviewed = values; return { eq: async () => ({ error: null }) }; } };
  } };
  const { approveShopifyStagedOrder } = createLoader({ [`${root}/lib/supabase/client.ts`]: { supabase } })('lib/supabase/shopify-orders.ts');
  const staged = { ...mapShopifyOrder(order()), id: 'review-test', price: 0, delivery_date_time: '2026-09-25T00:00:00Z' };
  await approveShopifyStagedOrder(staged);
  assert.equal(inserted.delivery_date_time, staged.delivery_date_time);
  assert.equal(inserted.price, 0);
  assert.equal(reviewed.review_status, 'Imported');
});

test('actual webhook -> GraphQL reader -> mapper -> staging writes correct values in isolation', async () => {
  const originalFetch = global.fetch;
  const originalInfo = console.info;
  const originalError = console.error;
  const envKeys = ['SHOPIFY_STORE_DOMAIN', 'SHOPIFY_ADMIN_ACCESS_TOKEN', 'SHOPIFY_API_SECRET', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const writes = [];
  const logEntries = [];
  const supabase = { from(table) {
    assert.equal(table, 'shopify_orders', 'Webhook must never insert daily orders directly');
    return { upsert(values) {
      writes.push(values);
      return { select() { return { maybeSingle: async () => ({ data: { id: 'stage-test', ...values }, error: null }) }; } };
    } };
  } };
  try {
    console.info = (entry) => logEntries.push(JSON.parse(entry));
    console.error = (entry) => logEntries.push(JSON.parse(entry));
    Object.assign(process.env, {
      SHOPIFY_STORE_DOMAIN: 'sync-test.myshopify.com', SHOPIFY_ADMIN_ACCESS_TOKEN: 'test', SHOPIFY_API_SECRET: 'test-secret',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test',
    });
    const isolated = createLoader({ '@supabase/supabase-js': { createClient: () => supabase } });
    const { POST } = isolated('app/api/shopify/webhooks/orders/route.ts');
    const { NextRequest } = require('next/server');
    let source;
    global.fetch = async (url, init) => {
      assert.equal(url, 'https://sync-test.myshopify.com/admin/api/2026-07/graphql.json');
      assert.match(JSON.parse(init.body).query, /currentShippingPriceSet\s*\{\s*shopMoney\s*\{\s*amount/);
      return new Response(JSON.stringify({ data: { order: source } }));
    };
    const request = (signature, topic = 'orders/create') => {
      const body = JSON.stringify({ admin_graphql_api_id: 'gid://shopify/Order/test' });
      const hmac = crypto.createHmac('sha256', 'test-secret').update(body).digest('base64');
      return new NextRequest('https://app.test/api/shopify/webhooks/orders', {
        method: 'POST', body, headers: { 'x-shopify-topic': topic, 'x-shopify-hmac-sha256': signature ?? hmac },
      });
    };
    for (const amount of ['15.00', '25.00', '35.00', '0.00']) {
      source = order({ currentShippingPriceSet: { shopMoney: { amount } } });
      const response = await POST(request());
      assert.equal(response.status, 200);
      const saved = writes.at(-1);
      assert.ok(saved.details.includes(`Delivery Fee: ${Number(amount)}`));
      assert.equal(saved.price, 100);
      assert.equal(saved.delivery_date_time, '2026-09-25T03:00:00.000Z');
      assert.equal(saved.raw_order.id, source.id);
    }
    const before = writes.length;
    assert.equal((await POST(request('invalid'))).status, 401);
    assert.equal((await POST(request(undefined, 'orders/updated'))).status, 200);
    assert.equal(writes.length, before);
    for (const event of ['shopify.webhook.received', 'shopify.webhook.fetch_started', 'shopify.webhook.order_fetched', 'shopify.webhook.staged', 'shopify.webhook.rejected', 'shopify.webhook.ignored']) {
      assert.ok(logEntries.some((entry) => entry.event === event), `expected log event ${event}`);
    }
    assert.equal(logEntries.filter((entry) => entry.event === 'shopify.webhook.order_fetched').at(-1).deliveryFee, 0);
    assert.equal(logEntries.find((entry) => entry.event === 'shopify.webhook.staged').orderName, '#test');
    assert.ok(logEntries.every((entry) => !JSON.stringify(entry).includes('test-secret')));
  } finally {
    global.fetch = originalFetch;
    console.info = originalInfo;
    console.error = originalError;
    for (const key of envKeys) {
      if (originalEnv[key] === undefined) delete process.env[key]; else process.env[key] = originalEnv[key];
    }
  }
});

test('replayed orders/create never overwrites a reviewed schedule, price or details', async () => {
  let stored;
  const supabase = { from(table) {
    assert.equal(table, 'shopify_orders');
    return {
      upsert(values, options) {
        const duplicate = Boolean(stored);
        if (!duplicate || !options.ignoreDuplicates) stored = { id: 'stage-test', ...values };
        const response = async () => ({ data: duplicate && options.ignoreDuplicates ? null : stored, error: null });
        return { select: () => ({ single: response, maybeSingle: response }) };
      },
      select() { return { eq: () => ({ single: async () => ({ data: stored, error: null }) }) }; },
    };
  } };
  const savedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const savedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test';
    const { stageShopifyOrder } = createLoader({ '@supabase/supabase-js': { createClient: () => supabase } })('lib/shopify/staging.ts');
    await stageShopifyOrder(order());
    Object.assign(stored, { review_status: 'In review', details: 'Manually corrected', price: 0, delivery_date_time: '2026-09-25T00:00:00Z' });
    const replayed = await stageShopifyOrder(order());
    assert.equal(replayed.details, 'Manually corrected');
    assert.equal(replayed.price, 0);
    assert.equal(replayed.delivery_date_time, '2026-09-25T00:00:00Z');
    assert.equal(replayed.review_status, 'In review');
  } finally {
    if (savedUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = savedUrl;
    if (savedKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = savedKey;
  }
});

function reviewPageHarness(stagedOrder, save) {
  let approveCount = 0;
  const isolated = createLoader({
    react: { ...React, useEffect: () => {}, useState(initial) {
      return [Array.isArray(initial) ? [stagedOrder] : initial === true ? false : initial, () => {}];
    } },
    '@/lib/supabase/shopify-orders': {
      updateShopifyStagedOrder: save,
      approveShopifyStagedOrder: async () => { approveCount++; },
    },
  });
  const Page = isolated('app/shopify/page.tsx').default;
  const tree = Page();
  function findApprove(element) {
    if (!React.isValidElement(element)) return null;
    if (element.type === 'button' && element.props.children === 'Approve & add to orders') return element;
    for (const child of React.Children.toArray(element.props.children)) {
      const found = findApprove(child);
      if (found) return found;
    }
    return null;
  }
  return { approve: () => findApprove(tree).props.onClick(), count: () => approveCount };
}

test('review page stops approval when saving fails or the schedule is missing', async () => {
  const failedSave = reviewPageHarness({ ...mapShopifyOrder(order()), id: 'stage-test', delivery_date_time: '2026-09-25T00:00:00Z' }, async () => { throw new Error('Save failed'); });
  await failedSave.approve();
  assert.equal(failedSave.count(), 0);
  const pendingDate = reviewPageHarness({ ...mapShopifyOrder(order()), id: 'stage-test' }, async () => { throw new Error('Must not save'); });
  await pendingDate.approve();
  assert.equal(pendingDate.count(), 0);
});
