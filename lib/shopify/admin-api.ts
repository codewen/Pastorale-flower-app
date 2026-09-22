import crypto from "node:crypto";

const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-07";

export interface ShopifyCustomAttribute {
  key: string;
  value: string;
}

export interface ShopifyOrder {
  id: string;
  name: string;
  createdAt: string;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string | null;
  currentTotalPriceSet: { shopMoney: { amount: string } };
  customer: { id: string; email: string | null } | null;
  customAttributes: ShopifyCustomAttribute[];
  lineItems: {
    nodes: Array<{
      title: string;
      quantity: number;
      variant: { title: string | null } | null;
    }>;
  };
  shippingLines: { nodes: Array<{ title: string }> };
}

interface OrdersResponse {
  orders: {
    nodes: ShopifyOrder[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

const ORDER_FIELDS = `
  id
  name
  createdAt
  displayFinancialStatus
  displayFulfillmentStatus
  currentTotalPriceSet { shopMoney { amount } }
  customer { id email }
  customAttributes { key value }
  lineItems(first: 100) {
    nodes { title quantity variant { title } }
  }
  shippingLines(first: 10) { nodes { title } }
`;

function getShopDomain(): string {
  const domain = process.env.SHOPIFY_STORE_DOMAIN?.trim();
  if (!domain) throw new Error("SHOPIFY_STORE_DOMAIN is not configured");
  return domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function getConfiguredAccessToken(): string | null {
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim();
  return token || null;
}

let cachedClientCredentialsToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const configured = getConfiguredAccessToken();
  if (configured) return configured;

  const clientId = process.env.SHOPIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "Configure SHOPIFY_ADMIN_ACCESS_TOKEN or SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET",
    );
  }
  if (cachedClientCredentialsToken && cachedClientCredentialsToken.expiresAt > Date.now() + 60_000) {
    return cachedClientCredentialsToken.value;
  }

  const response = await fetch(`https://${getShopDomain()}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });
  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || `Shopify token request returned ${response.status}`);
  }
  cachedClientCredentialsToken = {
    value: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in || 86_399) * 1000,
  };
  return payload.access_token;
}

async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const accessToken = await getAccessToken();
  const response = await fetch(
    `https://${getShopDomain()}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    },
  );

  const payload = (await response.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };
  if (!response.ok || payload.errors?.length || !payload.data) {
    throw new Error(
      payload.errors?.map((error) => error.message).join("; ") ||
        `Shopify API returned ${response.status}`,
    );
  }
  return payload.data;
}

export type ShopifyWebhookTopic =
  | "ORDERS_CREATE"
  | "ORDERS_UPDATED"
  | "ORDERS_PAID"
  | "ORDERS_FULFILLED"
  | "ORDERS_CANCELLED";

export async function registerShopifyWebhooks(webhookUrl: string) {
  const existing = await graphql<{
    webhookSubscriptions: { nodes: Array<{ id: string; topic: ShopifyWebhookTopic; uri: string }> };
  }>(
    `query WebhookSubscriptions {
      webhookSubscriptions(first: 100) { nodes { id topic uri } }
    }`,
    {},
  );

  const topics: ShopifyWebhookTopic[] = ["ORDERS_CREATE"];
  const created: Array<{ id: string; topic: string; uri: string }> = [];
  const skipped: string[] = [];

  for (const topic of topics) {
    if (existing.webhookSubscriptions.nodes.some((item) => item.topic === topic && item.uri === webhookUrl)) {
      skipped.push(topic);
      continue;
    }

    const result = await graphql<{
      webhookSubscriptionCreate: {
        webhookSubscription: { id: string; topic: string; uri: string } | null;
        userErrors: Array<{ field: string[] | null; message: string }>;
      };
    }>(
      `mutation CreateWebhook($topic: WebhookSubscriptionTopic!, $input: WebhookSubscriptionInput!) {
        webhookSubscriptionCreate(topic: $topic, webhookSubscription: $input) {
          webhookSubscription { id topic uri }
          userErrors { field message }
        }
      }`,
      { topic, input: { uri: webhookUrl, format: "JSON" } },
    );
    if (result.webhookSubscriptionCreate.userErrors.length) {
      throw new Error(
        result.webhookSubscriptionCreate.userErrors.map((error) => error.message).join("; "),
      );
    }
    if (result.webhookSubscriptionCreate.webhookSubscription) {
      created.push(result.webhookSubscriptionCreate.webhookSubscription);
    }
  }

  return { webhookUrl, created, skipped };
}

export async function getShopifyOrder(id: string): Promise<ShopifyOrder> {
  const data = await graphql<{ order: ShopifyOrder | null }>(
    `query Order($id: ID!) { order(id: $id) { ${ORDER_FIELDS} } }`,
    { id },
  );
  if (!data.order) throw new Error(`Shopify order not found: ${id}`);
  return data.order;
}

export async function listShopifyOrders(query = ""): Promise<ShopifyOrder[]> {
  const orders: ShopifyOrder[] = [];
  let after: string | null = null;
  do {
    const data: OrdersResponse = await graphql<OrdersResponse>(
      `query Orders($after: String, $query: String) {
        orders(first: 100, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
          nodes { ${ORDER_FIELDS} }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      { after, query: query || null },
    );
    orders.push(...data.orders.nodes);
    after = data.orders.pageInfo.hasNextPage ? data.orders.pageInfo.endCursor : null;
  } while (after);
  return orders;
}

export function verifyShopifyWebhook(rawBody: string, signature: string | null): boolean {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret || !signature) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const expected = Buffer.from(digest, "utf8");
  const actual = Buffer.from(signature, "utf8");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
