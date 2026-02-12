-- Table matching your "Essential Trading Invoices" export (Airtable/Whalesync style).
-- Run this in Supabase SQL Editor to create the table, then run your INSERT from
-- Essential Trading Invoices_rows.sql to load data (or import via Supabase UI).
-- In .env set: SUPABASE_INVOICES_TABLE="Essential Trading Invoices" (with quotes in shell if needed)
-- and SUPABASE_INVOICES_WIDE=true

create table if not exists public."Essential Trading Invoices" (
  id text primary key,
  essential_trading_load text,
  pick_up_date text,
  shipper_name text,
  shipper_city_state text,
  shipper_address text,
  invoiced_customer_internal_use text,
  receiver_address text,
  receiver_city_state text,
  invoiced_to text,
  receiver_name text,
  weight_lbs text,
  cubes text,
  cust_freight_charges text,
  customer_ref text,
  customer_updated_text text,
  billed_status text,
  notes text,
  actual_pod_that_link_goes_to text,
  pod_link text,
  pod_attachment text,
  street_adress_from_customer_updated_text text,
  wise_payment_link text,
  pieces text,
  payment_request text,
  payment_status text,
  pdf_generator_attachment text,
  payment_receipt text,
  email_to_send text,
  expected_payment_date text,
  city_state_zip_from_customer_updated_text text,
  airtable_record_id text,
  email_field text
);

comment on table public."Essential Trading Invoices" is 'Invoices from Essential Trading Invoices export; app reads this when SUPABASE_INVOICES_TABLE and SUPABASE_INVOICES_WIDE are set.';
