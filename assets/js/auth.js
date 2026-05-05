/**
 * Readii — Auth Module v1.0.0
 * 依赖 supabase-client.js 中的全局变量 _supabase
 */

// 注册
async function authSignUp(email, password, childName, childAge) {
  const { data, error } = await _supabase.auth.signUp({ email, password });
  if (error) throw error;

  // 创建用户档案
  await _supabase.from('user_profiles').insert({
    id: data.user.id,
    display_name: email.split('@')[0],
    child_name: childName,
    child_age: parseInt(childAge) || null,
    subscription_status: 'free'
  });

  return data;
}

// 登录
async function authSignIn(email, password) {
  const { data, error } = await _supabase.auth.signInWithPassword({
    email, password
  });
  if (error) throw error;
  return data;
}

// 登出
async function authSignOut() {
  await _supabase.auth.signOut();
  window.location.reload();
}

// 获取当前用户
async function authGetCurrentUser() {
  const { data: { user } } = await _supabase.auth.getUser();
  return user;
}

// 获取用户订阅状态
async function authGetSubscription(userId) {
  const { data } = await _supabase
    .from('user_profiles')
    .select('subscription_status, subscription_end, child_name, child_age')
    .eq('id', userId)
    .single();
  return data;
}

// 监听登录状态变化
function authOnStateChange(callback) {
  return _supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

// ── UI: 显示登录/注册弹窗 ──
function showAuthModal(mode = 'signin') {
  // 移除旧弹窗
  const old = document.getElementById('auth-modal');
  if (old) old.remove();

  const isSignIn = mode === 'signin';
  const isZh = document.body.classList.contains('zh');

  const modal = document.createElement('div');
  modal.id = 'auth-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);backdrop-filter:blur(6px);';
  modal.innerHTML = `
    <div style="background:var(--white);border-radius:var(--rxl);padding:40px;width:400px;max-width:90vw;box-shadow:var(--shm);position:relative;">
      <button onclick="document.getElementById('auth-modal').remove()" style="position:absolute;top:14px;right:14px;background:none;border:none;font-size:18px;cursor:pointer;color:var(--ink3);">&times;</button>
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-family:var(--serif);font-size:24px;margin-bottom:6px;">${isSignIn ? (isZh ? '登录 Readii' : 'Sign in to Readii') : (isZh ? '注册 Readii' : 'Create your account')}</div>
        <div style="font-size:13px;color:var(--ink3);">${isSignIn ? (isZh ? '访问你的阅读库' : 'Access your reading library') : (isZh ? '开始免费试用' : 'Start your free trial')}</div>
      </div>
      <form id="auth-form" onsubmit="handleAuthSubmit(event, '${mode}')">
        ${!isSignIn ? `
          <input id="auth-child-name" type="text" placeholder="${isZh ? '孩子名字' : "Child's name"}" style="width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:6px;font-size:14px;margin-bottom:10px;font-family:var(--sans);">
          <input id="auth-child-age" type="number" placeholder="${isZh ? '孩子年龄 (3-12)' : 'Child age (3-12)'}" min="3" max="12" style="width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:6px;font-size:14px;margin-bottom:10px;font-family:var(--sans);">
        ` : ''}
        <input id="auth-email" type="email" placeholder="${isZh ? '邮箱地址' : 'Email address'}" required style="width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:6px;font-size:14px;margin-bottom:10px;font-family:var(--sans);">
        <input id="auth-password" type="password" placeholder="${isZh ? '密码' : 'Password'}" required minlength="6" style="width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:6px;font-size:14px;margin-bottom:16px;font-family:var(--sans);">
        <div id="auth-error" style="color:#c0392b;font-size:12px;margin-bottom:10px;display:none;"></div>
        <button type="submit" class="btn-p" style="width:100%;padding:12px;font-size:14px;">${isSignIn ? (isZh ? '登录' : 'Sign in') : (isZh ? '注册' : 'Create account')}</button>
      </form>
      <div style="text-align:center;margin-top:16px;font-size:13px;color:var(--ink3);">
        ${isSignIn
          ? `${isZh ? '还没有账号？' : "Don't have an account?"} <a href="#" onclick="showAuthModal('signup');return false;" style="color:var(--forest);font-weight:500;">${isZh ? '注册' : 'Sign up'}</a>`
          : `${isZh ? '已有账号？' : 'Already have an account?'} <a href="#" onclick="showAuthModal('signin');return false;" style="color:var(--forest);font-weight:500;">${isZh ? '登录' : 'Sign in'}</a>`
        }
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('auth-email').focus();
}

// ── UI: 处理表单提交 ──
async function handleAuthSubmit(e, mode) {
  e.preventDefault();
  const errEl = document.getElementById('auth-error');
  errEl.style.display = 'none';

  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;

  try {
    if (mode === 'signup') {
      const childName = document.getElementById('auth-child-name')?.value || '';
      const childAge = document.getElementById('auth-child-age')?.value || '';
      await authSignUp(email, password, childName, childAge);
      const isZh = document.body.classList.contains('zh');
      errEl.style.color = 'var(--forest)';
      errEl.style.display = 'block';
      errEl.textContent = isZh ? '注册成功！请查看邮箱确认链接。' : 'Account created! Please check your email to confirm.';
    } else {
      await authSignIn(email, password);
      document.getElementById('auth-modal').remove();
      updateAuthUI();
      // 登录成功后继续待支付流程
      if (typeof resumePendingCheckout === 'function') resumePendingCheckout();
    }
  } catch (err) {
    errEl.style.color = '#c0392b';
    errEl.style.display = 'block';
    errEl.textContent = err.message;
  }
}

// ── UI: 根据登录状态更新界面 ──
async function updateAuthUI() {
  const user = await authGetCurrentUser();
  const signInBtn = document.querySelector('.btn-si');

  if (user) {
    const profile = await authGetSubscription(user.id);
    const name = profile?.child_name || user.email.split('@')[0];

    if (signInBtn) {
      signInBtn.textContent = name;
      signInBtn.href = '#';
      signInBtn.onclick = (e) => { e.preventDefault(); authSignOut(); };
    }

    // 更新 app view 侧边栏用户名
    const sbun = document.querySelector('.sbun');
    const sbuav = document.querySelector('.sbuav');
    if (sbun) sbun.textContent = name;
    if (sbuav) sbuav.textContent = name.charAt(0).toUpperCase();
  } else {
    if (signInBtn) {
      signInBtn.onclick = (e) => { e.preventDefault(); showAuthModal('signin'); };
    }
  }
}

// ── 初始化 ──
document.addEventListener('DOMContentLoaded', () => {
  // 把 Sign in 链接改为弹窗
  const signInBtn = document.querySelector('.btn-si');
  if (signInBtn) {
    signInBtn.href = '#';
    signInBtn.onclick = (e) => { e.preventDefault(); showAuthModal('signin'); };
  }

  // 检查当前登录状态
  updateAuthUI();

  // 监听状态变化
  authOnStateChange((event, session) => {
    updateAuthUI();
    // v2.6.2: invalidate Personal Library beta cache so a logged-out user
    // can't keep accessing PL via a stale cached "true" if they previously
    // logged in as an allowlisted account in the same tab.
    if (typeof plInvalidateBetaCache === 'function') plInvalidateBetaCache();
  });
});
