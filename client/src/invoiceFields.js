/**
 * Human-readable labels for invoice CSV columns and grouping for display.
 * Any column not in the map gets a formatted key (e.g. pod_link → Pod link).
 */

export const FIELD_LABELS = {
  id: 'Invoice ID',
  essential_trading_load: 'Load #',
  pick_up_date: 'Pick-up date',
  shipper_name: 'Shipper',
  shipper_city_state: 'Shipper city/state',
  shipper_address: 'Shipper address',
  invoiced_customer_internal_use: 'Customer (internal)',
  receiver_address: 'Receiver address',
  receiver_city_state: 'Receiver city/state',
  invoiced_to: 'Invoiced to',
  receiver_name: 'Receiver',
  weight_lbs: 'Weight (lbs)',
  cubes: 'Cubes',
  cust_freight_charges: 'Amount',
  customer_ref: 'Customer ref',
  customer_updated_text: 'Customer (updated)',
  billed_status: 'Billed status',
  notes: 'Notes',
  actual_pod_that_link_goes_to: 'BOL/POD link',
  pod_link: 'POD link',
  pod_attachment: 'POD attachment',
  street_adress_from_customer_updated_text: 'Street address (customer)',
  wise_payment_link: 'Wise payment link',
  pieces: 'Pieces',
  payment_request: 'Payment request',
  payment_status: 'Payment status',
  pdf_generator_attachment: 'PDF invoice',
  payment_receipt: 'Payment receipt',
  email_to_send: 'Email (to send)',
  expected_payment_date: 'Expected payment date',
  city_state_zip_from_customer_updated_text: 'City, state, zip (customer)',
  airtable_record_id: 'Airtable record ID',
  email_field: 'Email',
};

/** Keys that belong to "Payment & documents" section; the rest go in "Invoice & shipment". */
export const PAYMENT_KEYS = new Set([
  'payment_status', 'payment_request', 'payment_receipt', 'wise_payment_link',
  'pdf_generator_attachment', 'expected_payment_date', 'email_to_send', 'email_field',
]);

/** Preferred order for invoice section (others appended after). */
export const INVOICE_ORDER = [
  'id', 'essential_trading_load', 'pick_up_date', 'invoiced_to', 'invoiced_customer_internal_use',
  'receiver_name', 'customer_ref', 'customer_updated_text', 'shipper_name', 'shipper_address',
  'shipper_city_state', 'receiver_address', 'receiver_city_state', 'street_adress_from_customer_updated_text',
  'city_state_zip_from_customer_updated_text', 'weight_lbs', 'cubes', 'pieces', 'cust_freight_charges',
  'billed_status', 'notes', 'actual_pod_that_link_goes_to', 'pod_link', 'pod_attachment',
  'airtable_record_id',
];

/** Preferred order for payment section. */
export const PAYMENT_ORDER = [
  'payment_status', 'payment_request', 'expected_payment_date', 'wise_payment_link',
  'pdf_generator_attachment', 'payment_receipt', 'email_field', 'email_to_send',
];

export function getFieldLabel(key) {
  return FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getInvoiceKeys(invoice) {
  const keys = Object.keys(invoice);
  const invoiceKeys = keys.filter((k) => !PAYMENT_KEYS.has(k));
  const paymentKeys = keys.filter((k) => PAYMENT_KEYS.has(k));
  const sortByOrder = (arr, order) =>
    [...arr].sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
  return {
    invoice: sortByOrder(invoiceKeys, INVOICE_ORDER),
    payment: sortByOrder(paymentKeys, PAYMENT_ORDER),
  };
}
