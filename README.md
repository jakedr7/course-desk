# Course Desk

A better front end for Moodle. Deadlines counted down, a calendar and to-do list
built from every course, each course's files in one search, grades with feedback,
and announcements from all courses together. Works on phones (installable, works
offline) and on laptops.

Anyone can use it with their own school's Moodle and their own key. There is no
server and no database: each student's browser talks straight to their own
Moodle, the same way the official Moodle app does.

## How it works

```
 Student's browser                               Their school's Moodle
┌──────────────────────────────┐   HTTPS POST   ┌───────────────────────────┐
│ Course Desk (static files)   │ ─────────────▶ │ /webservice/rest/server.php│
│ key + cached data kept in    │ ◀───────────── │  (mobile web service)      │
│ this browser's localStorage  │     JSON       └───────────────────────────┘
└──────────────────────────────┘
```

- **Hosting** is any static host (GitHub Pages, Netlify, Cloudflare Pages). The
  hosted files contain no keys and no student data.
- **Keys** are pasted once per device and stored in that browser only. They are
  sent only to the Moodle site they belong to; file links get the key added only
  when they point at that same site.
- **Data** is cached per account in the browser, so the app opens instantly and
  still shows the last-loaded deadlines offline. Opening the app refreshes it.
- **Lecturer-written HTML** (descriptions, announcements, feedback) is cleaned
  with DOMPurify before it is shown.
- The built site ships a strict Content Security Policy: scripts only from the
  site itself, network requests only over https.

### Moodle requirements

The school's Moodle must have the **Moodle mobile web service** enabled (it is on
by default, and it's what the official Moodle app uses). Each student gets their
key from *Preferences > Security keys* on their Moodle
(`/user/managetoken.php`). Standard Moodle allows these requests from other
websites; if a school blocks them, Course Desk says it couldn't reach the site.

Web service functions used, all part of the mobile service:
`core_webservice_get_site_info`, `core_enrol_get_users_courses`,
`core_calendar_get_action_events_by_timesort`, `core_calendar_get_calendar_events`,
`core_course_get_contents`, `gradereport_overview_get_course_grades`,
`gradereport_user_get_grade_items`, `mod_assign_get_assignments`,
`mod_assign_get_submission_status`, `mod_quiz_get_quizzes_by_courses`,
`mod_forum_get_forums_by_courses`, `mod_forum_get_forum_discussions`,
`message_popup_get_popup_notifications`.

## Features

- **Home**: countdown to the next deadline, the week at a glance, a grouped to-do
  list (overdue, today, tomorrow, this week), course cards, latest announcements
  and new files.
- **Calendar**: month view of every deadline and course event, filter by course,
  day agenda.
- **Courses**: each course gets a generated "notebook cover" in its colour. Course
  pages have an overview by week (files, assignments, quizzes, links), a file
  browser with search and type filters, grades with feedback, and announcements.
- **Activity details**: due dates, submission status (submitted, draft, graded),
  description and attachments, without opening Moodle.
- **Grades**: course totals with progress bars and everything graded recently.
- **Inbox**: Moodle notifications and all announcements.
- **Search** (Ctrl K / Cmd K or /): courses, to-dos, activities, files and
  announcements.
- **Settings**: pick which enrolments show (this semester's are chosen
  automatically from course dates, older offerings are hidden), nickname and
  recolour courses, light/dark theme, several accounts, replace or remove the key,
  and a link to invite classmates with the school pre-filled.
- **Sample data** mode so people can try it before connecting.

## Develop

```
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests for the data layer
npm run build      # type-check and build to dist/
```

Code layout:

- `src/lib/moodle.ts`: talking to Moodle (request encoding, errors, file links)
- `src/lib/api.ts`: typed Moodle calls shaped for the interface
- `src/lib/query.ts`: stale-while-revalidate cache, saved per account
- `src/lib/data.ts`: React hooks the screens use
- `src/lib/demo.ts`: sample data served through the same interface as Moodle
- `src/lib/courses.ts`: picking this semester's courses, colours and covers
- `src/pages/`: the screens; `src/ui/`: shared components
- `src/styles/tokens.css`: colours, type and spacing for light and dark

To change which school is pre-filled for new visitors, edit `DEFAULT_SITE` in
`src/config.ts`. A link like `https://your-site/?site=moodle.myschool.edu`
pre-fills a different one.

## Deploy

**GitHub Pages** (free for public repositories): push this folder as its own
repository, then in the repository go to *Settings > Pages* and set *Source* to
*GitHub Actions*. The workflow in `.github/workflows/deploy.yml` tests, builds
and publishes on every push to `main`. The site appears at
`https://<username>.github.io/<repository>/`.

**Netlify**: import the repository (settings come from `netlify.toml`), or run
`npm run build` and drag the `dist` folder onto <https://app.netlify.com/drop>.

**Cloudflare Pages**: build command `npm run build`, output directory `dist`.

The site must be served over https for the offline mode and home-screen install.

## Phone app

- **Android**: `.github/workflows/android.yml` builds a real Android app (Capacitor)
  on every push to `main` and attaches `CourseDesk.apk` to the repository's
  **android** release. Open the Releases page on the phone, download the APK and
  install it. The app sends Moodle requests through Android's own HTTP stack, so it
  works even with schools that block requests from websites.
  To make updates install over each other, sign with your own key: create one with
  `keytool -genkey -v -keystore release.jks -alias coursedesk -keyalg RSA -keysize 2048 -validity 10000`
  and add the repository secrets `ANDROID_KEYSTORE_BASE64` (`base64 -w0 release.jks`),
  `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD`.
  Without them each build is a debug build, and an update may need the old app
  uninstalled first.
- **iPhone**: open the website in Safari, then Share > Add to Home Screen. It opens
  full screen like an app and works offline. A true App Store app needs a Mac with
  Xcode and a paid Apple developer account (`npx cap add ios`).

Local Android build (needs Android Studio): `npm run build && npx cap sync android && npx cap open android`.

Course Desk isn't made by Moodle or by any school.
