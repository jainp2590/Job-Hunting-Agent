# Job Hunting Agent

A Node.js pipeline that acts as **CareerAgent**: an expert career assistant for software engineers. You provide your **resume PDF** and **up to 10 tags** (skills, role, location); the app **searches job portals** by those tags, scores each job, computes an **ATS score**, suggests resume tweaks, drafts cover letters, and **lists every result in a Google Sheet** with apply links so you can apply in one place.

---

## Features

- **Job search by tags** — Enter up to 10 tags (e.g. “Node.js”, “JavaScript”, “Remote”, “Backend”), comma-separated; the app searches the web for jobs matching those tags (via JSearch API or mock data when no API key).
- **Job matching** — For each job found, analyzes fit (skills, experience, seniority). Assigns a 0–100 match score and Apply/Skip decision.
- **ATS score** — Computes a 0–100 ATS (Applicant Tracking System) score from resume vs job description keyword overlap.
- **Resume optimization** — Suggests how to align your resume with each job (keywords, tweaks); never invents experience.
- **Cover letter draft** — Generates a tailored cover letter per job.
- **Resume tailored per job** — For each job, the app builds a modified resume (targeted summary + your content), generates a PDF, saves it to a local resume folder (`data/resumes` by default), and adds the link in the sheet and UI. Open or download from the **Tailored resume** link.
- **Google Sheets tracking** — Each job is appended to your sheet with: date, company, title, job URL, match score, ATS score, decision, reasoning, resume notes, cover letter, and **modified_resume_link** (path to the tailored PDF).

---

## Project structure

```
Job-Hunting-Agent/
├── public/
│   └── index.html                  # Web UI: resume + tags + sheet link
├── src/
│   ├── index.js                    # Entrypoint; sample run + env config
│   ├── server.js                   # Express + /api/evaluate, /api/search-and-apply
│   ├── agents/
│   │   └── CareerAgentPipeline.js   # Match scoring, reasoning, cover letter
│   ├── services/
│   │   └── job_search_service.js    # Job search (JSearch API or mock)
│   ├── utils/
│   │   ├── ats_score.js             # ATS score from resume vs job text
│   │   └── resume_optimizer.js      # Optimized summary per job
│   └── tracking/
│       ├── job_application_tracker.js           # Local Excel (xlsx) tracker
│       └── google_sheets_job_application_tracker.js  # Google Sheets tracker
├── data/                           # Created when using Excel tracker (optional)
├── tests/                          # Automated tests (Jest + supertest)
│   ├── api/                        # API endpoint tests
│   ├── unit/                       # Unit tests (tags, sheet, drive, pipeline)
│   ├── helpers/                    # Test helpers (e.g. PDF buffer)
│   └── routes.test.js              # Static and route tests
├── docs/
│   └── QA_TEST_CASES.md            # Full QA test case list + automation map
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

Copy the example env file and fill in your values:

```bash
cp .env.example .env
# Edit .env and set GOOGLE_APPLICATION_CREDENTIALS, JOB_AGENT_SHEET_URL, RAPIDAPI_KEY (optional)
```

The app loads `.env` automatically (via `dotenv`). Do not commit `.env`; it is listed in `.gitignore`.

---

## Web UI (resume PDF + tags + Google Sheet link)

The frontend takes your **resume PDF** and **up to 10 tags** (comma-separated). The app searches for jobs matching those tags, evaluates each one (match score + ATS score), suggests resume tweaks, generates a cover letter, and lists every job in your Google Sheet with apply links. For each job, it also generates a **tailored resume PDF** using an HTML template that matches your base resume layout.

1. Set `GOOGLE_APPLICATION_CREDENTIALS` if you want to record to Google Sheets (see [Google Sheets setup](#google-sheets-setup)).
2. Optional: set `RAPIDAPI_KEY` for live job search (see [Job search](#job-search-api)). Without it, the app uses mock job data so you can test the flow.
3. Start the server:

   ```bash
   npm run server
   ```

4. Open [http://localhost:3000](http://localhost:3000).
5. Fill in:
   - **Resume**: Upload a **resume PDF** (required; max 5 MB). Profile is inferred from the PDF.
   - **Tags**: Up to 10 comma-separated tags (e.g. “Node.js, JavaScript, Remote, Backend”). The app searches job portals by these tags and evaluates each result.
   - **Google Sheet link** (optional): Your sheet URL; share the sheet with the service account. Each job is appended with match score, ATS score, decision, resume notes, and cover letter.
6. Click **Search jobs & apply**. The page shows a table of jobs with match score, ATS score, decision, apply link, and expandable reasoning and cover letter. All rows are also written to your sheet. Results are **paginated**: each request returns 10 jobs, and you can move between pages using the **Prev/Next** pagination controls at the top of the table.

### Modified resume HTML template

The app uses an HTML template file (`sample_resume.html` in the project root) as the base layout for tailored resumes:

- `sample_resume.html` should represent your **baseline resume layout** (fonts, sections, header, etc.).
- For each job, the backend:
  - Builds a **targeted summary** (based on your parsed resume text and the specific job).
  - Injects that summary into the **PROFESSIONAL SUMMARY** section of `sample_resume.html`.
  - Converts the resulting HTML to PDF and saves it under `data/resumes/` (or `RESUME_OUTPUT_DIR`), serving it at `/resumes/...`.
- The rest of the resume sections (Experience, Skills, Projects, Education, etc.) come from the HTML template, so the visual structure stays consistent.

If you want to change the visual style of your tailored resumes, edit `sample_resume.html` and restart the server.

---

## Job search API

Job search uses [JSearch](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) on RapidAPI. Without an API key, the app returns **mock jobs** (3 sample listings) so you can run the full flow.

The backend calls JSearch with:

- A query built from your tags (joined into a single search string).
- A **page number** (0-based in the UI, converted to 1-based for the API).
- A fixed page size of **10 jobs per page** (JSearch default for a single page).

Each `/api/search-and-apply` request:

- Fetches **one JSearch page** (10 jobs).
- Evaluates those jobs with the `CareerAgentPipeline`.
- Generates tailored resume PDFs for each job and writes them to the sheet (if configured).

To use live job search:

1. Sign up at [RapidAPI](https://rapidapi.com/) and subscribe to the JSearch API (free tier available).
2. Copy your RapidAPI key and set:

   ```bash
   export RAPIDAPI_KEY="your-rapidapi-key"
   ```

3. Restart the server. Searches will then use real job listings.

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

Set them in `.env` (recommended) or export in your shell:

- `GOOGLE_APPLICATION_CREDENTIALS` — Path to the service account JSON key file (for Sheets only).
- `JOB_AGENT_SHEET_URL` — Full Google Sheet URL (optional; can also be set per request in the UI).
- `RESUME_OUTPUT_DIR` — (Optional) Folder for tailored resume PDFs; default `data/resumes`. Served at `/resumes/` so you can open or download saved PDFs from the UI.
- `RAPIDAPI_KEY` — Your RapidAPI key for live job search (optional; mock jobs used if unset).
- `PORT` — Server port (default 3000).
- `LOG_LEVEL` — Logging level: `debug` | `info` | `warn` | `error` (default: `info`).

---

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Yes (for Sheets) | Path to service account JSON key file. |
| `JOB_AGENT_SHEET_URL` | No (for Sheets) | Full Google Sheet URL; used when you pass a sheet link in the UI. |
| `RESUME_OUTPUT_DIR` | No | Folder for tailored resume PDFs (default: `data/resumes`); served at `/resumes/`. |
| `RAPIDAPI_KEY` | No (for job search) | RapidAPI key for JSearch; without it, mock jobs are used. |
| `LOG_LEVEL` | No | `debug` \| `info` \| `warn` \| `error`. |

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

const pipeline = new CareerAgentPipeline({ match_threshold: 70 });

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

Rows appended by the tracker have one row per job:

| Column | Description |
|--------|-------------|
| `date` | ISO timestamp when the row was written. |
| `company_name` | From job posting. |
| `job_title` | Job title. |
| `location` | Job location. |
| `job_url` | Apply link for the job (from job search). |
| `job_match_score` | 0–100 match score. |
| `ats_score` | 0–100 ATS (keyword) score. |
| `decision` | Apply or Skip. |
| `key_matching_skills` | Comma-separated matching skills. |
| `missing_skills` | Comma-separated missing required skills. |
| `seniority_alignment` | Short text on profile vs job seniority. |
| `resume_optimization_notes` | Summary of resume tweaks for this job. |
| `cover_letter_draft` | Generated cover letter text. |
| `modified_resume_link` | Path or link to the tailored resume PDF (saved locally; served at `/resumes/...`). |

The first row is written as a header if the sheet is empty.

---

## Testing

Automated tests cover the [QA test cases](docs/QA_TEST_CASES.md) (API, tags, sheet URL, local resume save, security, edge cases).

```bash
npm test
npm run test:coverage
```

Tests use Jest and supertest; external services (job search) are mocked so no API keys are required to run the suite.

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
