// Readii — Library with Access Control + Progress v1.3.3
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

// 读取用户所有进度
export async function loadProgress(userId) {
  const { data, error } = await _supabase
    .from('progress')
    .select('lesson_id, reading_completed, commentary_completed, reading_progress_seconds, pronunciation_score')
    .eq('user_id', userId)

  if (error) return {}
  return Object.fromEntries(data.map(p => [p.lesson_id, p]))
}

// 保存进度
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

// 读取 streak
export async function loadStreak(userId) {
  const { data } = await _supabase
    .from('streaks')
    .select('current_streak, longest_streak, last_activity_date')
    .eq('user_id', userId)
    .single()
  return data
}

// 更新 streak
export async function updateStreak(userId) {
  const today = new Date().toISOString().split('T')[0]
  const { data: existing } = await _supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!existing) {
    await _supabase.from('streaks').insert({
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      last_activity_date: today
    })
    return 1
  }

  const last = existing.last_activity_date
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  let newStreak = existing.current_streak
  if (last === today) {
    return newStreak // already recorded today
  } else if (last === yesterdayStr) {
    newStreak += 1 // consecutive
  } else {
    newStreak = 1 // streak broken
  }

  await _supabase.from('streaks').update({
    current_streak: newStreak,
    longest_streak: Math.max(newStreak, existing.longest_streak),
    last_activity_date: today
  }).eq('user_id', userId)

  return newStreak
}
