/**
 * Readii Supabase Client
 * 初始化 Supabase 连接，供前端使用
 */

const SUPABASE_URL = 'https://bltfljdgjxhcmbfduert.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsdGZsamRnanhoY21iZmR1ZXJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NjQwMDMsImV4cCI6MjA5MTM0MDAwM30.WL8e6w1x_Bz437jtke8ZhFF0GpBo2WlG5-7wvLm8o2s';

// 使用 Supabase CDN（在 index.html 中通过 <script> 引入）
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>

const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * 获取 Storage 文件的签名 URL（私有 bucket 需要）
 */
async function getSignedUrl(storagePath, expiresIn = 3600) {
  const { data, error } = await _supabase.storage
    .from('readii-content')
    .createSignedUrl(storagePath, expiresIn);
  if (error) {
    console.error('签名 URL 失败:', error.message);
    return null;
  }
  return data.signedUrl;
}

/**
 * 获取当前登录用户
 */
async function getCurrentUser() {
  const { data: { user } } = await _supabase.auth.getUser();
  return user;
}

/**
 * 检查用户订阅状态
 */
async function getUserProfile(userId) {
  const { data, error } = await _supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return error ? null : data;
}
