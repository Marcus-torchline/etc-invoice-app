import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' }) : null;

export async function createStripeCheckout({ amountCents, invoiceId, customerEmail, description, successUrl, cancelUrl }) {
  if (!stripe) throw new Error('STRIPE_SECRET_KEY is not set in .env');
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Invoice #${invoiceId}`,
            description: description || 'Freight invoice',
            metadata: { invoiceId: String(invoiceId) },
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    customer_email: customerEmail || undefined,
    metadata: { invoiceId: String(invoiceId) },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  return session.url;
}
