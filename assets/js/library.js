// Readii — Library with Access Control v1.2.0
// Uses global _supabase from supabase-client.js
// Uses global authGetCurrentUser, authGetSubscription from auth.js

export async function checkAccess() {
  const user = await authGetCurrentUser()
  if (!user) return { hasAccess: false, user: null, status: 'guest' }

  const profile = await authGetSubscription(user.id)
  const hasAccess = profile?.subscription_status === 'active'

  return { hasAccess, user, status: profile?.subscription_status || 'free' }
}

export async function loadLibrary() {
  const { data: books, error } = await _supabase
    .from('books')
    .select(`
      id, title, title_zh, series, level,
      total_days, cover_image_url, age_min, age_max,
      lessons (
        id, day_number, reading_audio_url,
        commentary_audio_url, reading_duration_seconds
      )
    `)
    .eq('is_published', true)
    .order('level', { ascending: true })

  if (error) {
    console.error('Library load error:', error)
    return []
  }
  return books
}

export async function loadProgress(userId) {
  const { data, error } = await _supabase
    .from('progress')
    .select('lesson_id, reading_completed, commentary_completed, pronunciation_score')
    .eq('user_id', userId)

  if (error) return {}
  return Object.fromEntries(data.map(p => [p.lesson_id, p]))
}

export async function saveProgress(userId, lessonId, updates) {
  const { error } = await _supabase
    .from('progress')
    .upsert({
      user_id: userId,
      lesson_id: lessonId,
      last_accessed: new Date().toISOString(),
      ...updates
    }, { onConflict: 'user_id,lesson_id' })

  if (error) console.error('Progress save error:', error)
}
