// Readii — Stripe Webhook Handler v1.0.0
// 支付成功后自动更新用户订阅状态

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body, sig, webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // 订阅支付成功
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const customerEmail = session.customer_email;
    const mode = session.mode; // subscription or payment

    if (!customerEmail) {
      console.log('No customer email, skipping');
      return { statusCode: 200, body: 'OK' };
    }

    // 计算订阅到期时间
    const now = new Date();
    let subscriptionEnd = null;

    if (mode === 'subscription') {
      subscriptionEnd = new Date(now.setMonth(now.getMonth() + 1))
        .toISOString().split('T')[0];
    } else if (mode === 'payment') {
      // £299 一次性课程，给6个月访问权限
      subscriptionEnd = new Date(now.setMonth(now.getMonth() + 6))
        .toISOString().split('T')[0];
    }

    // 通过邮箱找用户
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const user = authUsers?.users?.find(u => u.email === customerEmail);

    if (user) {
      await supabase.from('user_profiles').upsert({
        id: user.id,
        subscription_status: 'active',
        subscription_start: new Date().toISOString().split('T')[0],
        subscription_end: subscriptionEnd,
        stripe_customer_id: session.customer,
      }, { onConflict: 'id' });

      console.log(`Updated subscription for ${customerEmail}`);
    } else {
      console.log(`User not found for email: ${customerEmail}`);
    }
  }

  // 订阅取消
  if (stripeEvent.type === 'customer.subscription.deleted') {
    const subscription = stripeEvent.data.object;
    const customerId = subscription.customer;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (profile) {
      await supabase.from('user_profiles').update({
        subscription_status: 'cancelled',
      }).eq('id', profile.id);

      console.log(`Cancelled subscription for customer ${customerId}`);
    }
  }

  return { statusCode: 200, body: 'OK' };
};
