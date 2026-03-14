# Job Hunting Agent

A Node.js pipeline that acts as **CareerAgent**: an expert career assistant for software engineers. It matches your profile to job postings, scores fit, suggests resume tweaks, drafts cover letters, and records every decision in a **Google Sheet** so you can track applications in one place.

---

## Features

- **Job matching** — Analyzes job descriptions and your profile (skills, experience, seniority, tech stack). Assigns a 0–100 match score and only recommends applying when the score is above your threshold.
- **Resume optimization** — Suggests how to highlight existing experience and align with job keywords; never invents skills or experience you don’t have.
- **Cover letter draft** — Generates a short, tailored cover letter for the company and role.
- **Apply / Skip decision** — Clear Apply or Skip per job, with reasoning (matching skills, missing skills, seniority alignment).
- **Google Sheets tracking** — Appends each evaluation (date, company, title, score, decision, reasoning) to a sheet you provide via link.

---

## Project structure

```
Job-Hunting-Agent/
├── src/
│   ├── index.js                    # Entrypoint; sample run + env config
│   ├── agents/
│   │   └── CareerAgentPipeline.js   # Match scoring, reasoning, cover letter
│   └── tracking/
│       ├── job_application_tracker.js           # Local Excel (xlsx) tracker
│       └── google_sheets_job_application_tracker.js  # Google Sheets tracker
├── data/                           # Created when using Excel tracker (optional)
├── package.json
└── Readme.md
```

---

## Prerequisites

- **Node.js** 16+ (or 18+ recommended)
- **Google Cloud project** with Sheets API enabled and a **service account** (for Google Sheets tracking)

---

## Installation

```bash
git clone <repo-url>
cd Job-Hunting-Agent
npm install
```

---

## Google Sheets setup

Tracking writes to a **Google Sheet** you own. You need a service account and to share that sheet with it.

### 1. Create a Google Cloud project and enable Sheets API

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or pick an existing one).
3. Enable **Google Sheets API**: APIs & Services → Enable APIs and Services → search “Google Sheets API” → Enable.

### 2. Create a service account and key

1. APIs & Services → **Credentials** → **Create credentials** → **Service account**.
2. Name it (e.g. `job-hunting-agent`), then **Create and continue** (roles optional for this use case).
3. Open the new service account → **Keys** → **Add key** → **Create new key** → **JSON** → save the file somewhere safe (e.g. `./keys/job-agent-sa.json`).

### 3. Share your Google Sheet with the service account

1. Create or open the Google Sheet you want to use (e.g. “Job Applications”).
2. Copy the **sheet link** (e.g. `https://docs.google.com/spreadsheets/d/ABC123.../edit#gid=0`).
3. Click **Share** and add the **service account email** (from the JSON key, e.g. `job-hunting-agent@your-project.iam.gserviceaccount.com`) as **Editor**. Leave “Notify people” unchecked.

### 4. Set environment variables

Point the app to the key file and your sheet:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/your-service-account-key.json"
export JOB_AGENT_SHEET_URL="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit#gid=0"
```

- `GOOGLE_APPLICATION_CREDENTIALS` — Path to the service account JSON key.
- `JOB_AGENT_SHEET_URL` — Full Google Sheet URL; the app will extract the sheet ID from it.

---

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Yes (for Sheets) | Path to service account JSON key file. |
| `JOB_AGENT_SHEET_URL` | Yes (for Sheets) | Full Google Sheet URL (e.g. `https://docs.google.com/spreadsheets/d/ID/edit...`). |

If `JOB_AGENT_SHEET_URL` is not set, the sample in `index.js` still runs the pipeline and prints output, but recording to Google Sheets will be skipped (no sheet ID).

---

## Usage

### Run the sample (pipeline + Google Sheet)

With credentials and sheet URL set:

```bash
npm start
```

This will:

1. Run the pipeline with a built-in sample profile and job posting.
2. Print to the console: match score, decision, reasoning, resume suggestions, and cover letter draft.
3. Append one row to the **Applications** sheet in your Google Sheet (if `JOB_AGENT_SHEET_URL` is set).

### Use the pipeline in your own code

```javascript
const { CareerAgentPipeline } = require("./src/agents/CareerAgentPipeline");
const {
  GoogleSheetsJobApplicationTracker,
} = require("./src/tracking/google_sheets_job_application_tracker");

const pipeline = new CareerAgentPipeline({ match_threshold: 75 });

const sheet_url = process.env.JOB_AGENT_SHEET_URL;
const sheet_id =
  GoogleSheetsJobApplicationTracker.parseSheetIdFromUrl(sheet_url);

const tracker = new GoogleSheetsJobApplicationTracker({
  sheet_id,
  sheet_name: "Applications", // optional; default is "Applications"
});

const user_profile = {
  summary: "Senior Node.js engineer with MySQL and Redis.",
  headline: "Senior Backend Engineer",
  skills: ["Node.js", "JavaScript", "MySQL", "Redis", "AWS"],
  experiences: [
    {
      title: "Senior Backend Engineer",
      company: "TechCorp",
      description: "Built Node.js microservices with MySQL and Redis.",
      technologies: ["Node.js", "MySQL", "Redis", "Docker"],
      years: 4,
    },
  ],
};

const job_posting = {
  title: "Senior Node.js Engineer",
  company_name: "AwesomeStartup",
  location: "Remote",
  description: "Looking for Node.js, JavaScript, MySQL, Redis. Nice to have: AWS.",
};

const result = pipeline.processJob(user_profile, job_posting);

await tracker.recordApplication(job_posting, result);
```

---

## User profile shape

Pass a single object with at least `skills` and `experiences` (other fields improve matching and cover letter):

| Field | Type | Description |
|-------|------|-------------|
| `summary` | string | Short bio (e.g. resume summary). |
| `headline` | string | Professional headline. |
| `skills` | string[] | List of skills (e.g. `["Node.js", "MySQL"]`). |
| `experiences` | object[] | List of roles; each can have: |

| Experience field | Type | Description |
|------------------|------|-------------|
| `title` | string | Job title. |
| `company` | string | Company name. |
| `description` | string | Role description (used for matching). |
| `technologies` | string[] | Technologies used. |
| `years` | number | Years in that role (used for seniority). |

---

## Job posting shape

Each job is a single object:

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Job title. |
| `company_name` | string | Company name. |
| `location` | string | Location (e.g. "Remote"). |
| `description` | string | Full job description (used for skill/keyword extraction). |

---

## Pipeline output

`pipeline.processJob(user_profile, job_posting)` returns:

| Field | Type | Description |
|-------|------|-------------|
| `job_match_score` | number | 0–100 match score. |
| `decision` | `"Apply"` \| `"Skip"` | Based on `match_threshold`. |
| `reasoning` | object | `key_matching_skills`, `missing_skills`, `seniority_alignment`. |
| `resume_optimization_suggestions` | string[] | Bullet/keyword suggestions (no fabrication). |
| `cover_letter_draft` | string | Plain-text cover letter. |

---

## Google Sheet columns (Applications sheet)

Rows appended by the tracker have one row per evaluation:

| Column | Description |
|--------|-------------|
| `date` | ISO timestamp when the row was written. |
| `company_name` | From `job_posting.company_name`. |
| `job_title` | From `job_posting.title`. |
| `location` | From `job_posting.location`. |
| `job_match_score` | 0–100. |
| `decision` | Apply or Skip. |
| `key_matching_skills` | Comma-separated matching skills. |
| `missing_skills` | Comma-separated missing required skills. |
| `seniority_alignment` | Short text on profile vs job seniority. |

The first row is written as a header if the sheet is empty.

---

## Optional: Excel (local) tracker

If you prefer a local file instead of Google Sheets, use the Excel tracker and write to `data/job_applications.xlsx`:

```javascript
const { JobApplicationTracker } = require("./src/tracking/job_application_tracker");

const tracker = new JobApplicationTracker({
  file_path: "./data/job_applications.xlsx", // optional
});

tracker.recordApplication(job_posting, result);
```

Same columns as the Google Sheet; no Google credentials required.

---

## Match score and threshold

- **Score** is computed from:
  - **Skills** (required + nice-to-have from the job description) vs your profile skills and experience text.
  - **Seniority** inferred from job title/description and your experience years/titles.
- **Decision**: `Apply` when `job_match_score >= match_threshold`, otherwise `Skip`. Default threshold is `70`; override in the constructor, e.g. `new CareerAgentPipeline({ match_threshold: 75 })`.

---

## Ethical behavior

The agent is designed to:

- **Never fabricate** skills, achievements, or experience.
- **Only suggest** resume changes based on what’s already in your profile.
- **Record reasoning** for every Apply/Skip so decisions are transparent.

---

## License

MIT.
