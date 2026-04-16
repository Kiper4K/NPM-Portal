# North Penn-Mansfield Class of 2026 Portal

An open source student portal template for class websites, school communities, and student organizations. The site is built as a static multi-page front end with Supabase powering authentication, profiles, announcements, events, fundraisers, moderation, album uploads, and community features.

## Features
- Student account sign-up and sign-in
- Google sign-in with Supabase Auth
- Public directory and profile pages
- Forum threads and replies
- After-graduation plans
- Events and registration
- Fundraiser tracking
- Public photo album
- Admin moderation tools
- Temporary account bans with a banned page and appeal form

## Tech Stack
- HTML
- CSS
- JavaScript
- Supabase
- Netlify

## Project Structure
- `index.html` - homepage and portal overview
- `accounts.html` - sign-up, sign-in, and profile editing
- `directory.html` - student directory
- `plans.html` - after-graduation plans
- `forum.html` - class discussion forum
- `events.html` - events and registration
- `fundraisers.html` - fundraiser tracking
- `officers.html` - class officer spotlight page
- `admin.html` - admin tools and moderation
- `banned.html` - banned-user landing page and appeal form
- `styles.css` - shared styling
- `script.js` - shared front-end logic
- `supabase-setup.sql` - schema, policies, and setup SQL

## Open Source Use
You may use this project as a starting point or template for your own class, club, or school portal under the terms of the MIT License.

## Setup Notes
To run this project fully, you will need:
- a Supabase project
- your Supabase URL and anon key in `supabase-config.js`
- the SQL from `supabase-setup.sql` applied in Supabase
- optional Netlify hosting for deployment

## Netlify
If this project is hosted with Netlify for the open source program, include a visible powered-by-Netlify link or badge where required by Netlify's policy.

## Contributing
Contributions, suggestions, and improvements are welcome. Please read the Code of Conduct before contributing.

## License
This project is licensed under the MIT License. See `LICENSE` for details.