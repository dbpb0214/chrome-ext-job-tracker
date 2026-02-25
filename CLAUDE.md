# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Loading the Extension

There is no build step. Load the extension directly from the repo root in Chrome:

1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the project root directory

After making code changes, click the reload icon on the extension card in `chrome://extensions/`.

## Architecture

This is a Manifest V3 Chrome extension with three main components:

**`background.js`** — Service worker that initializes `chrome.storage.local` with an empty `applications` array on install.

**`content.js`** — Injected into job board pages (greenhouse.io, ashbyhq.com, and career URL patterns). Listens for two messages from the popup:
- `getJobDetails` — Extracts company name and job title from DOM, returns them to popup
- `updateJobApplicationForm` — Fills in application form fields (name, email, phone, LinkedIn) using stored applicant data

**`popup/`** — The extension popup UI, structured as ES modules:
- `popup.html` — Main UI with two panels: Applicant Details form and Job Application form
- `popup.js` — Entry point; initializes state, queries active tab, detects if current page is a known job site, sends `getJobDetails` message to content script, checks for duplicate URLs
- `popup/handlers/eventHandlers.js` — Wires DOM events to module methods
- `popup/modules/applications.js` — CRUD for job applications stored under the `applications` key in `chrome.storage.local`; handles display, save, delete, export to `.txt`
- `popup/modules/applicants.js` — CRUD for the single applicant profile stored under the `applicant` key; includes resume upload (stored as base64 via FileReader), auto-fill dispatch to content script
- `popup/modules/event-handlers.js` — Unused legacy file (superseded by `popup/handlers/eventHandlers.js`)

## Storage Schema

`chrome.storage.local` holds two keys:

```js
// applications: array of job application objects
{
  id: string,        // Date.now().toString()
  company: string,
  position: string,
  url: string,
  status: string,    // "Applied" | "To Apply" | "Interview Scheduled" | "Rejected" | "Offer"
  notes: string,
  date: string,      // YYYY-MM-DD
  created: string    // ISO 8601
}

// applicant: single object for the user's personal info
{
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  linkedin: string,
  location: string,  // e.g. "New York, NY"
  resume: [{
    name: string,
    originalFileName: string,
    content: string,   // base64 data URL
    dateAdded: string  // ISO 8601
  }]  // max 1 entry
}
```

## Adding Support for New Job Boards

Two places must be updated:

1. **`manifest.json`** — Add the site pattern to `content_scripts[0].matches`
2. **`content.js`** — Add a new `else if` branch in `extractJobDetails()` with site-specific DOM selectors for company name and job title
3. **`popup.js`** — Add the hostname to the `jobSites` array in `isKnownJobSite()`

The `extractCompanyName()` helper in `content.js` parses page titles of the form `"Job Title at Company Name"` by finding the word `"at"` or `"@"`.
