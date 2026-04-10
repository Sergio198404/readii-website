/**
 * Readii — Checkout Handler v1.0.0
 * 依赖全局变量: STRIPE_CONFIG, authGetCurrentUser
 */

async function startCheckout(priceId, mode) {
  try {
    const user = await authGetCurrentUser();
    const email = user?.email || null;

    const res = await fetch('/.netlify/functions/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId: priceId,
        customerEmail: email,
        mode: mode || 'subscription',
      }),
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error);
    window.location.href = data.url;

  } catch (err) {
    console.error('Checkout error:', err);
    const isZh = document.body.classList.contains('zh');
    alert(isZh
      ? '支付启动失败，请稍后重试或联系 hello@readii.co.uk'
      : 'Payment could not be started. Please try again or contact hello@readii.co.uk');
  }
}

function handleCheckout(type) {
  if (type === 'children') {
    startCheckout(STRIPE_CONFIG.prices.monthly_children, 'subscription');
  } else if (type === 'pro') {
    startCheckout(STRIPE_CONFIG.prices.one_time_pro, 'payment');
  }
}

// 检查支付结果
function checkPaymentResult() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('payment') === 'success') {
    showSuccessBanner();
    window.history.replaceState({}, '', '/');
  }
}

function showSuccessBanner() {
  const isZh = document.body.classList.contains('zh');
  const banner = document.createElement('div');
  banner.style.cssText = 'position:fixed;top:72px;left:50%;transform:translateX(-50%);background:#1B3A2D;color:white;padding:14px 28px;border-radius:8px;font-size:14px;z-index:999;box-shadow:0 4px 20px rgba(0,0,0,0.2);';
  banner.textContent = isZh
    ? '✓ 支付成功 — 欢迎加入 Readii！请查看邮箱获取下一步指引。'
    : '✓ Payment successful — welcome to Readii! Check your email to get started.';
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 6000);
}

// 页面加载时检查支付结果
document.addEventListener('DOMContentLoaded', checkPaymentResult);
