// checkout's config, stood in for: the INR the live page showed on 2026-11-20 (rates come from the product's defaults)
export async function getPaymentConfig() { return { ok: true, data: { currency: 'INR' } }; }
