#!/usr/bin/env node
/**
 * Surgical patch: flip reviewer@readii.co.uk subscription_status to 'active'
 * with a 1-year window. No other fields touched — password and seeded
 * activity data are preserved.
 *
 * Usage: node scripts/upgrade-reviewer-subscription.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const REVIEWER_EMAIL = 'reviewer@readii.co.uk';

(async () => {
  const { data: list, error: lerr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (lerr) { console.error('listUsers:', lerr.message); process.exit(1); }
  const u = list.users.find(x => x.email && x.email.toLowerCase() === REVIEWER_EMAIL);
  if (!u) { console.error(`No auth user for ${REVIEWER_EMAIL}`); process.exit(1); }

  const today = new Date();
  const oneYearLater = new Date(today.getTime() + 365 * 86400000);

  const { error } = await supabase.from('user_profiles').update({
    subscription_status: 'active',
    subscription_start: today.toISOString().slice(0, 10),
    subscription_end: oneYearLater.toISOString().slice(0, 10),
  }).eq('id', u.id);

  if (error) { console.error('update:', error.message); process.exit(1); }

  console.log('═══ Reviewer Subscription Activated ═══');
  console.log(`Email:               ${REVIEWER_EMAIL}`);
  console.log(`User ID:             ${u.id}`);
  console.log(`Subscription:        active`);
  console.log(`Start:               ${today.toISOString().slice(0, 10)}`);
  console.log(`End:                 ${oneYearLater.toISOString().slice(0, 10)}`);
  console.log('═══════════════════════════════════════');
})().catch(e => { console.error(e); process.exit(1); });
