// The organism's content, worked out the way the product does (currency-config.ts getPricingTier), so every variant
// shows the same true numbers.
import { DEFAULT_CURRENCY_RATES, getCurrencyMeta, getPricingTier, roundToNearest9 } from '@/lib/currency-config';
const CUR = 'INR', meta = getCurrencyMeta(CUR), rate = DEFAULT_CURRENCY_RATES[CUR] ?? 1;
const at = (learners) => roundToNearest9(getPricingTier(learners).basePriceUsd * rate);
const money = (n) => `${meta.symbol}${n.toLocaleString('en-IN')}`;
export const content = {
  currency: CUR, symbol: meta.symbol, price: at(0), next: at(500), money,
  stages: [
    { id: 'founding', label: 'Founding learners', description: `First 500 · ${money(at(0))}` },
    { id: 'early', label: 'Early learners', description: `Next 500 · ${money(at(500))}` },
    { id: 'standard', label: 'Standard', description: `After 1,000 · ${money(at(1000))}` },
  ],
};
