import paypal from '@paypal/checkout-server-sdk';

function environment() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return process.env.PAYPAL_SANDBOX !== 'false'
    ? new paypal.core.SandboxEnvironment(clientId, clientSecret)
    : new paypal.core.LiveEnvironment(clientId, clientSecret);
}

function client() {
  const env = environment();
  if (!env) return null;
  return new paypal.core.PayPalHttpClient(env);
}

export async function createPayPalOrder({ amount, invoiceId, description, returnUrl, cancelUrl }) {
  const c = client();
  if (!c) throw new Error('PayPal credentials (PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET) not set in .env');
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  const body = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code: 'USD',
          value: amount.toFixed(2),
        },
        description: description || `Invoice #${invoiceId}`,
        reference_id: String(invoiceId),
      },
    ],
  };
  if (returnUrl || cancelUrl) {
    body.application_context = {
      return_url: returnUrl,
      cancel_url: cancelUrl,
      brand_name: 'Essential Trading',
    };
  }
  request.requestBody(body);
  const response = await c.execute(request);
  const orderId = response.result.id;
  const approveLink = response.result.links?.find((l) => l.rel === 'approve');
  return { orderId, approvalUrl: approveLink?.href || null };
}

export async function capturePayPalOrder(orderId) {
  const c = client();
  if (!c) throw new Error('PayPal credentials not set');
  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});
  const response = await c.execute(request);
  return response.result;
}
