# Shelf Scout

Personal reading list app with live Radnor Township Library availability checking.

## Features
- Save books with title, author, genre, and notes
- Live availability checking against the Delaware County catalog (charlotte.delco.lib.pa.us)
- Shows whether each book is on shelf, checked out, not at Radnor, etc.
- Call number displayed when book is available
- Sort by availability to see what's on shelf right now
- Persistent storage via localStorage
- One-click link to open any book in the full catalog

## Deploy to Vercel

1. Push this folder to a new GitHub repo
2. Go to vercel.com → Add New Project → Import that repo
3. No environment variables needed
4. Deploy — done

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## How availability works

The `/api/library` serverless function proxies requests to `charlotte.delco.lib.pa.us`,
parses the HTML response, and returns the status for the Radnor branch specifically.
This runs server-side so there are no CORS issues.

Click ↻ on any book card to refresh its status, or use "Check All" in the header
to refresh every book (runs sequentially to be polite to the library server).
