# TeamUp

Campus collaboration for verified SRMIST Kattankulathur students. Built with Next.js 16, TypeScript, Supabase Auth/PostgreSQL/Storage, and the existing TeamUp dashboard design.

## Local setup (Windows PowerShell)

```powershell
cd 'C:\Users\ellan\OneDrive\Desktop\TeamUp'
npm.cmd install
Copy-Item .env.example .env.local
notepad .env.local
npm.cmd run dev
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to your Supabase project URL and publishable key. Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` and `APPROVED_EMAIL_DOMAINS=srmist.edu.in`. The publishable key is intended for browser use; never put a service-role key in `NEXT_PUBLIC_*` variables.

In the Supabase SQL Editor, run `supabase/migrations/001_initial.sql`, `002_campus_gate.sql`, `003_authenticated_grants.sql`, then `004_team_workspace.sql` in order. For an existing installation, apply only migrations not yet applied. In Supabase Auth URL Configuration, set the site URL to `http://localhost:3000`, add `http://localhost:3000/auth/callback` as a redirect, and enable email confirmation. The `avatars` storage bucket and policies are created by the first two migrations. For deployment, use the deployment origin for `NEXT_PUBLIC_SITE_URL` and add its callback URL to Auth redirects.

Supabase Realtime may be enabled for `public.team_messages` and `public.project_tasks` in Database Publications. The team workspace also refreshes every 15 seconds, so chat and tasks work without Realtime publication. RLS limits reads and writes to members. The app requires an approved, confirmed email on both the server and in database policies.

## Features

- Campus registration, login, email confirmation, password reset, protected app routes
- Student profiles, avatar upload, discoverability choice, teammate filters, normalized skill matching
- Project creation and management, discovery filters, applications, transactional acceptance and rejection
- Owner invitations with transactional capacity checks and invitation responses
- Member-only team overview, chat history and sending, task creation, assignment, deadlines, status, and progress
- Recipient-only notifications, unread count, history, and read actions
- Dashboard with live project/team/request counts, recommendations, activity, and upcoming task deadlines

Project capacity includes the owner. An open project with two members and a maximum team size of two cannot accept another member. Skill matches are rule based: matched required skills divided by total required skills.

## Safe demo data

Use a real, confirmed campus account for Student A. The optional seed script signs in through Supabase Auth with the publishable key, creates six example projects under that account, and skips titles it already created. It cannot create authentication users. Run only for a development/demo database:

```powershell
$env:TEAMUP_DEMO_DATA='1'
$env:DEMO_EMAIL='student.a@srmist.edu.in'
$env:DEMO_PASSWORD='your-student-a-password'
node --env-file=.env.local scripts/demo-projects.mjs
Remove-Item Env:DEMO_PASSWORD,Env:DEMO_EMAIL,Env:TEAMUP_DEMO_DATA
```

The script creates AI-Based Attendance System, Smart Campus Navigation, College Event Management System, IoT-Based Smart Parking, Student Learning Assistant, and Hackathon Web Development Team. To demo the exact pairing flow, you can also create the AI project manually through the UI with maximum team size 2 and skills Python, React.

## Faculty walkthrough

1. Register and confirm two distinct `@srmist.edu.in` accounts. Log in as Student A and complete the profile with skills.
2. Create **AI-Based Attendance System** as a Minor project, set Python and React as required skills, and set maximum team size to 2. It appears in Explore Projects and My Projects.
3. In another browser profile, sign in as Student B, complete the profile, find the project in Explore Projects, inspect the skill match, and apply with a message.
4. Return to Student A. Open the notification bell and Received Requests, inspect B's profile, and accept. B receives an acceptance notification. Both accounts see the team in My Teams; the project has 2/2 members, so further applications are unavailable.
5. Open the private team workspace in both accounts. Send chat messages, create and assign tasks, change task status, and see progress and upcoming deadlines on the dashboard.
6. For invitations, A creates another open project, filters discoverable students in Find Teammates, selects that project, and invites B. B accepts in Notifications.
7. For rejection, have B apply to another open project and decline the request as A. The team remains open and B receives a notification.

## Verification

```powershell
npm.cmd run typecheck
npm.cmd run build
```

Both commands passed locally. No database credentials with permission to apply migrations or two confirmed demo accounts were available in this workspace, so live Supabase flows and RLS behavior still need a manual pass against the configured project. Apply migration `004_team_workspace.sql` before using the new workspace features.
