# North Penn-Mansfield Class of 2026 Portal

## Project Summary
A multi-page static class portal for the North Penn-Mansfield Class of 2026.
Hosted on Netlify and connected to Supabase for auth, profiles, announcements, photos, events, fundraisers, plans, forum posts, replies, reports, and admin moderation.

## Current Project Folder
`C:\Users\audri\OneDrive\Desktop\LTE Onedrive\OneDrive\Documents\New project`

## Hosting / Services
- Netlify site: `https://npm26.netlify.app/`
- Supabase project URL: `https://lhinozxfsavxrctyades.supabase.co`
- Supabase publishable key is stored in `supabase-config.js`
- Admin page access is protected in both the UI and frontend route guard, with Supabase policies protecting actual admin actions

## Main Files
- `index.html` home page
- `accounts.html` sign up, sign in, profile editing, avatar upload
- `directory.html` student directory
- `plans.html` after-graduation plans
- `forum.html` Tiger Talk forum
- `events.html` event registration page
- `fundraisers.html` fundraiser tracking page
- `officers.html` class officers page
- `admin.html` admin tools and moderation
- `styles.css` shared styling
- `script.js` shared frontend logic
- `supabase-setup.sql` schema, storage buckets, and RLS policies

## Current Features
- Supabase auth with signup/signin
- public profiles with editable headline, future plans, and bio
- profile photo upload through Supabase Storage
- default tiger profile picture fallback
- public album with uploads and admin removal
- announcements with featured banner text
- forum with replies, reports, voting, and deletion of own content
- after-grad plans with deletion of own content
- event registration with saved registrations
- fundraiser tracking with admin progress updates
- officer spotlight page
- top-right signed-in account chip
- shorter nav with a More dropdown
- admin-only nav visibility and admin route redirect
- temporary account bans with countdown
- graduation countdown on homepage

## Important Notes
- Re-upload the full project folder to Netlify after local file changes
- Re-run `supabase-setup.sql` in Supabase whenever schema or RLS changes are made
- Do NOT put secret server keys in browser files
- Resend is not fully set up because a verified sending domain is still needed
- Facebook embed/plugin may still depend on Facebook page/privacy/plugin behavior

## Current Design / Content Decisions
- Tiger image used for favicon and default avatar:
  `https://cdn.creazilla.com/cliparts/20088/tiger-head-clipart-original.png`
- Footer credit on pages:
  `Created and developed by Class President Landyn Empet.`
- Homepage Facebook section uses the class page:
  `https://www.facebook.com/people/North-Penn-Mansfield-Class-of-2026/61573898025906/`

## Known Follow-Ups
- test the More dropdown links after each deploy
- confirm whether the Facebook plugin feed renders reliably on Netlify
- if needed, replace the plugin with a custom Facebook-style spotlight/feed section
- replace officer placeholder photos and bios with real ones
- finish email sending only after getting a real domain for Resend

## How To Continue On Another Device
1. Sync/copy this project folder to the other computer
2. Open the folder in Codex
3. Ask Codex to read `PROJECT-NOTES.md` first
4. Then continue with new changes
