/**
 * Readii — Stripe Config v1.0.0
 * 价格 ID 在 Stripe Dashboard 创建产品后填入
 */

const STRIPE_CONFIG = {
  publishable_key: 'YOUR_STRIPE_PUBLISHABLE_KEY', // 待填
  prices: {
    monthly_children: 'YOUR_PRICE_ID_5GBP',       // £5/月 待填
    one_time_pro: 'YOUR_PRICE_ID_299GBP',          // £299 一次性 待填
  },
  success_url: 'https://readii.co.uk/?payment=success',
  cancel_url: 'https://readii.co.uk/?payment=cancelled',
};
