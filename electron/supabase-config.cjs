// Project URL + anon public key for the Supabase project backing licence
// revocation. Both are safe to ship in the app: the anon key only grants
// what Row Level Security allows (nothing, directly — see
// supabase/migrations), and the Edge Function is the sole path in.
//
// Fill these in after creating the Supabase project (Project Settings -> API).
module.exports = {
  SUPABASE_URL: 'https://bkwezdxsrgmhcnzjwoka.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_4msMFdqIow2rjRsSk4S9uA_gjtmXn_Z',
}
