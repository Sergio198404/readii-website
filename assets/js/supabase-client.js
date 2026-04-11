/**
 * Readii Supabase Client v1.2.2
 */

const SUPABASE_URL = 'https://bltfljdgjxhcmbfduert.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsdGZsamRnanhoY21iZmR1ZXJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NjQwMDMsImV4cCI6MjA5MTM0MDAwM30.WL8e6w1x_Bz437jtke8ZhFF0GpBo2WlG5-7wvLm8o2s';

// Supabase CDN loaded via <script> in index.html
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Get signed URL for private Storage bucket files
 */
async function getSignedUrl(storagePath, expiresIn = 3600) {
  const { data, error } = await _supabase.storage
    .from('readii-content')
    .createSignedUrl(storagePath, expiresIn);
  if (error) {
    console.error('Signed URL error:', error.message);
    return null;
  }
  return data.signedUrl;
}

/**
 * Get current logged-in user
 */
async function getCurrentUser() {
  const { data: { user } } = await _supabase.auth.getUser();
  return user;
}

/**
 * Get user subscription profile
 */
async function getUserProfile(userId) {
  const { data, error } = await _supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return error ? null : data;
}
