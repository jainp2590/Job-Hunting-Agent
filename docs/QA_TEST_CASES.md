# Job Hunting Agent – QA Test Cases (QAGuardian)

Comprehensive test cases for the Job Hunting Agent application.  
Format: Test Case ID, Feature/Module, Test Scenario, Preconditions, Test Steps, Expected Result, Test Type.

---

## 1. UI – Form & Inputs

**Test Case ID:** TC-UI-001  
**Feature / Module:** Resume & search tags form  
**Test Scenario:** Submit with valid PDF and tags  
**Preconditions:** Server running; valid PDF file available.  
**Test Steps:**
1. Open http://localhost:3000.
2. Select a PDF file in "Resume (PDF)".
3. Enter tags, e.g. "Node.js, JavaScript, Remote".
4. Optionally enter a Google Sheet URL.
5. Click "Search jobs & apply".
**Expected Result:** Button disables; "Searching jobs, parsing resume, and evaluating…" appears; then results table with jobs, Match, ATS, Decision, Tailored resume, Apply. No error.  
**Test Type:** Functional / UI

---

**Test Case ID:** TC-UI-002  
**Feature / Module:** Resume file input  
**Test Scenario:** File input accepts only PDF  
**Preconditions:** Server running.  
**Test Steps:**
1. Open the app.
2. Click "Resume (PDF)" and try selecting a .txt or .docx file (if browser allows).
3. Submit without selecting a file.
**Expected Result:** accept=".pdf,application/pdf" restricts to PDF where supported; required attribute prevents submit when no file selected; if form submits without file, server returns 400 "Resume PDF is required."  
**Test Type:** UI / Negative

---

**Test Case ID:** TC-UI-003  
**Feature / Module:** Tags input  
**Test Scenario:** Tags required and validated  
**Preconditions:** Server running.  
**Test Steps:**
1. Leave "Tags" empty and submit (with a PDF selected).
2. Enter only spaces or commas and submit.
**Expected Result:** Client-side required prevents empty submit where applicable; server returns 400 with message "At least one tag is required (e.g. Node.js, Remote). Up to 10." when tags normalize to empty.  
**Test Type:** UI / Negative

---

**Test Case ID:** TC-UI-004  
**Feature / Module:** Tags input – boundary (10 tags)  
**Test Scenario:** More than 10 tags are normalized to 10  
**Preconditions:** Server running; valid PDF.  
**Test Steps:**
1. Enter 12 comma-separated tags.
2. Submit form.
**Expected Result:** Server normalizes to first 10 tags; search runs with 10 tags; response includes `tags` array of length 10.  
**Test Type:** Functional / Edge Case

---

**Test Case ID:** TC-UI-005  
**Feature / Module:** Google Sheet URL input  
**Test Scenario:** Optional sheet URL – submit without it  
**Preconditions:** Server running; valid PDF and tags.  
**Test Steps:**
1. Leave "Google Sheet link" empty.
2. Submit with valid PDF and tags.
**Expected Result:** Request succeeds; results shown; no row written to any sheet; no 500 from missing sheet.  
**Test Type:** Functional

---

**Test Case ID:** TC-UI-006  
**Feature / Module:** Submit button state  
**Test Scenario:** Button disabled during request  
**Preconditions:** Server running.  
**Test Steps:**
1. Fill form and click "Search jobs & apply".
2. Observe button and result area during and after request.
**Expected Result:** Button becomes disabled during request; re-enables when request completes (success or error). Result area shows loading text then final content or error.  
**Test Type:** UI

---

**Test Case ID:** TC-UI-007  
**Feature / Module:** Results table – links and content  
**Test Scenario:** Apply and Tailored resume links and detail row  
**Preconditions:** Successful search-and-apply with at least one job.  
**Test Steps:**
1. Complete a successful search.
2. Check table: Job, Company, Location, Match, ATS, Decision, Tailored resume, Apply.
3. Click "Download" (tailored resume) and "Apply" for one row.
4. Expand detail row: Reasoning, Resume tweaks, Cover letter.
**Expected Result:** All columns present; "Download" opens Drive link in new tab; "Apply" opens job URL in new tab; detail row shows matching/missing skills, seniority, suggestions, cover letter. No raw HTML visible.  
**Test Type:** UI / Functional

---

**Test Case ID:** TC-UI-008  
**Feature / Module:** Error display  
**Test Scenario:** Server error shown in UI  
**Preconditions:** Server returns 4xx/5xx or network error.  
**Test Steps:**
1. Trigger error (e.g. no PDF, or stop server and submit).
2. Check result area.
**Expected Result:** Result area has error styling (#result.error); message shows `data.error` or "Request failed" or catch message; no stack trace or internal details.  
**Test Type:** UI / Error Handling

---

## 2. API – Search and apply

**Test Case ID:** TC-API-001  
**Feature / Module:** POST /api/search-and-apply  
**Test Scenario:** Success with PDF + tags  
**Preconditions:** Server running; valid PDF; RAPIDAPI_KEY optional (mock used if missing).  
**Test Steps:**
1. POST multipart/form-data: resume_pdf=<file>, tags="Node.js, Remote".
2. Assert status 200 and JSON body.
**Expected Result:** 200; body has success: true, tags array, search_query string, total_jobs number, results array; each result has job_title, company_name, job_match_score, ats_score, decision, reasoning, cover_letter_draft, modified_resume_link (or "").  
**Test Type:** Functional

---

**Test Case ID:** TC-API-002  
**Feature / Module:** POST /api/search-and-apply – no file  
**Test Scenario:** Reject when resume_pdf is missing  
**Preconditions:** Server running.  
**Test Steps:**
1. POST with tags only (no resume_pdf).
**Expected Result:** 400; JSON { success: false, error: "Resume PDF is required." }.  
**Test Type:** Negative

---

**Test Case ID:** TC-API-003  
**Feature / Module:** POST /api/search-and-apply – no tags  
**Test Scenario:** Reject when tags normalize to empty  
**Preconditions:** Server running; valid PDF in body.  
**Test Steps:**
1. POST with resume_pdf and tags="" or tags="  ,  ".
**Expected Result:** 400; JSON { success: false, error: "At least one tag is required (e.g. Node.js, Remote). Up to 10." }.  
**Test Type:** Negative

---

**Test Case ID:** TC-API-004  
**Feature / Module:** POST /api/search-and-apply – PDF with no extractable text  
**Test Scenario:** Reject or handle image-only / corrupted PDF  
**Preconditions:** Server running; PDF that returns empty text from pdf-parse.  
**Test Steps:**
1. Upload such a PDF with valid tags.
**Expected Result:** 400; JSON { success: false, error: "Could not extract text from the PDF." }.  
**Test Type:** Negative / Edge Case

---

**Test Case ID:** TC-API-005  
**Feature / Module:** POST /api/search-and-apply – file size limit  
**Test Scenario:** Reject PDF over 5 MB  
**Preconditions:** Server running; PDF > 5 MB.  
**Test Steps:**
1. POST with a PDF larger than 5 MB and valid tags.
**Expected Result:** 413 or 400 from multer; no server crash; no partial processing.  
**Test Type:** Edge Case / Negative

---

**Test Case ID:** TC-API-006  
**Feature / Module:** POST /api/search-and-apply – non-PDF file  
**Test Scenario:** Reject non-PDF upload  
**Preconditions:** Server running.  
**Test Steps:**
1. POST with a file that has mimetype image/png or application/octet-stream and filename not .pdf.
**Expected Result:** Multer fileFilter rejects; 400 or no file in req; error response.  
**Test Type:** Negative / Security

---

**Test Case ID:** TC-API-007  
**Feature / Module:** POST /api/evaluate (single job)  
**Test Scenario:** Evaluate single job with PDF and job fields  
**Preconditions:** Server running; valid PDF.  
**Test Steps:**
1. POST /api/evaluate multipart: resume_pdf, job_title, company_name, location, job_description, optional sheet_url.
**Expected Result:** 200; JSON with job_match_score, decision, reasoning, resume_optimization_suggestions, cover_letter_draft; if sheet_url valid, one row appended to sheet.  
**Test Type:** Functional

---

## 3. Tags and job search

**Test Case ID:** TC-TAG-001  
**Feature / Module:** Tag normalization  
**Test Scenario:** Comma and semicolon separators  
**Preconditions:** Server running; valid PDF.  
**Test Steps:**
1. POST search-and-apply with tags="Node.js; JavaScript, MySQL".
**Expected Result:** Tags normalized to ["Node.js", "JavaScript", "MySQL"]; search runs; response.tags matches.  
**Test Type:** Functional

---

**Test Case ID:** TC-TAG-002  
**Feature / Module:** Tag trimming and empty filter  
**Test Scenario:** Extra spaces and empty segments ignored  
**Preconditions:** Server running; valid PDF.  
**Test Steps:**
1. POST with tags="  Node.js  ,  , Remote  ".
**Expected Result:** tags array ["Node.js", "Remote"]; no empty strings; search succeeds.  
**Test Type:** Functional / Edge Case

---

**Test Case ID:** TC-TAG-003  
**Feature / Module:** Search query length cap  
**Test Scenario:** Very long tag list truncated in query  
**Preconditions:** buildSearchQueryFromTags caps at 200 chars.  
**Test Steps:**
1. Pass 10 very long tags so joined length > 200.
**Expected Result:** Query string is first 200 characters; no API failure from oversized query.  
**Test Type:** Edge Case

---

## 4. Google Sheet and Drive

**Test Case ID:** TC-SHEET-001  
**Feature / Module:** Sheet URL parsing  
**Test Scenario:** Valid and invalid sheet URLs  
**Preconditions:** Tracker or server parsing sheet URL.  
**Test Steps:**
1. Parse "https://docs.google.com/spreadsheets/d/ABC123xyz/edit#gid=0".
2. Parse "https://example.com", "", or URL with no spreadsheet id.
**Expected Result:** First returns sheet id "ABC123xyz"; others return "" or invalid; no throw.  
**Test Type:** Functional

---

**Test Case ID:** TC-SHEET-002  
**Feature / Module:** Sheet write – columns  
**Test Scenario:** Row has all columns including modified_resume_link  
**Preconditions:** Sheet URL set; credentials valid; Drive upload succeeds for at least one job.  
**Test Steps:**
1. Run search-and-apply with sheet_url.
2. Open sheet and check latest row.
**Expected Result:** Row has date, company_name, job_title, location, job_url, job_match_score, ats_score, decision, key_matching_skills, missing_skills, seniority_alignment, resume_optimization_notes, cover_letter_draft, modified_resume_link. modified_resume_link is a Drive view link when upload succeeded.  
**Test Type:** Functional

---

**Test Case ID:** TC-DRIVE-001  
**Feature / Module:** Drive upload – file name sanitization  
**Test Scenario:** Company/title with special characters  
**Preconditions:** Drive API enabled; credentials set.  
**Test Steps:**
1. Trigger upload with job company_name "Test & Co." and title "Dev/Ops".
**Expected Result:** File name sanitized (e.g. no / or &); no Drive API error from invalid name; link returned.  
**Test Type:** Edge Case

---

**Test Case ID:** TC-DRIVE-002  
**Feature / Module:** Drive upload failure handling  
**Test Scenario:** Drive or credentials fail  
**Preconditions:** Invalid credentials or Drive API disabled.  
**Test Steps:**
1. Run search-and-apply with valid PDF and tags.
**Expected Result:** Sheet row still written; modified_resume_link empty for that run; no 500; response still includes results.  
**Test Type:** Error Handling / Negative

---

## 5. Security

**Test Case ID:** TC-SEC-001  
**Feature / Module:** File upload – type enforcement  
**Test Scenario:** Only PDF accepted  
**Preconditions:** Server running.  
**Test Steps:**
1. Send file with Content-Disposition filename="resume.pdf" but body of an executable or script.
2. Send file with mimetype application/pdf but binary content not PDF.
**Expected Result:** Multer/fileFilter rejects non-PDF by mimetype/extension; pdf-parse may fail on invalid PDF and return 400 "Could not extract text from the PDF."; no arbitrary file write or execution.  
**Test Type:** Security

---

**Test Case ID:** TC-SEC-002  
**Feature / Module:** XSS in tags and sheet URL  
**Test Scenario:** Script payload in tags or sheet_url  
**Preconditions:** Server and UI running.  
**Test Steps:**
1. POST with tags="<script>alert(1)</script>, Node.js".
2. Submit sheet_url with javascript: or data: or "<script>" in query.
3. Render response in browser (results table).
**Expected Result:** Tags normalized; no script execution; response JSON does not inject unescaped HTML; UI must escape when rendering (e.g. textContent or escaped HTML for job titles/company).  
**Test Type:** Security

---

**Test Case ID:** TC-SEC-003  
**Feature / Module:** API misuse – wrong method and route  
**Test Scenario:** GET /api/search-and-apply; POST without multipart  
**Preconditions:** Server running.  
**Test Steps:**
1. GET /api/search-and-apply.
2. POST /api/search-and-apply with Content-Type application/json and body { tags: "x", resume_pdf: "base64..." }.
**Expected Result:** GET may 404 or 405; POST without multipart does not parse file; appropriate error (400/415).  
**Test Type:** Security / Negative

---

**Test Case ID:** TC-SEC-004  
**Feature / Module:** Sensitive data in error messages  
**Test Scenario:** 500 and 400 responses  
**Preconditions:** Server running.  
**Test Steps:**
1. Trigger 500 (e.g. invalid credentials, broken dependency).
2. Check JSON error field.
**Expected Result:** error is a short user-facing message; no stack trace, paths, or env vars in response.  
**Test Type:** Security / Error Handling

---

## 6. Edge cases and resilience

**Test Case ID:** TC-EDGE-001  
**Feature / Module:** Job search returns zero jobs  
**Test Scenario:** Tags match no jobs (mock or API)  
**Preconditions:** Server running; valid PDF and tags.  
**Test Steps:**
1. Use tags that mock/API returns [] for (if possible).
**Expected Result:** 200; total_jobs: 0; results: []; UI shows "No jobs found for these tags...". No 500.  
**Test Type:** Edge Case

---

**Test Case ID:** TC-EDGE-002  
**Feature / Module:** Job with missing fields  
**Test Scenario:** Job object with empty title, company, description  
**Preconditions:** Mock or API returns minimal job.  
**Test Steps:**
1. Run search-and-apply when a job has title: "", description: "".
**Expected Result:** Pipeline and ATS handle empty strings; no throw; row in sheet and result row with "—" or empty where applicable.  
**Test Type:** Edge Case

---

**Test Case ID:** TC-EDGE-003  
**Feature / Module:** Double submit  
**Test Scenario:** User clicks "Search jobs & apply" twice quickly  
**Preconditions:** Server running.  
**Test Steps:**
1. Fill form and click submit twice before first response.
**Expected Result:** Button disabled after first click; second click does not queue duplicate request or duplicate sheet rows (or duplicate is acceptable if no idempotency key). No client crash.  
**Test Type:** Edge Case / UI

---

**Test Case ID:** TC-EDGE-004  
**Feature / Module:** Very long tags string  
**Test Scenario:** Single tag or concatenated tags extremely long  
**Preconditions:** buildSearchQueryFromTags and normalizeTags in use.  
**Test Steps:**
1. Send tags string of 10 tags each 100 chars.
**Expected Result:** Query truncated to 200 chars; only first 10 tags used; no buffer overflow or timeout from huge query.  
**Test Type:** Edge Case

---

**Test Case ID:** TC-EDGE-005  
**Feature / Module:** Sheet exists with old header (13 columns)  
**Test Scenario:** Tracker ensures header has 14 columns  
**Preconditions:** Sheet already has 13-column header from previous version.  
**Test Steps:**
1. Run search-and-apply with sheet_url; tracker appends row with 14 values.
**Expected Result:** ensureHeaderRow updates header to 14 columns if current_header.length < 14; new row appends with modified_resume_link in column N; no mismatch.  
**Test Type:** Edge Case / Functional

---

## 7. Static assets and routing

**Test Case ID:** TC-ROUTE-001  
**Feature / Module:** Static files  
**Test Scenario:** GET / and GET /index.html  
**Preconditions:** Server running.  
**Test Steps:**
1. GET http://localhost:3000/.
2. GET http://localhost:3000/index.html.
**Expected Result:** 200; HTML returned; form and script present.  
**Test Type:** Functional

---

**Test Case ID:** TC-ROUTE-002  
**Feature / Module:** Unknown route  
**Test Scenario:** GET /api/unknown  
**Preconditions:** Server running.  
**Test Steps:**
1. GET /api/unknown.
**Expected Result:** 404 or appropriate response; no 500.  
**Test Type:** Negative

---

## Summary

| Type            | Count |
|-----------------|-------|
| Functional / UI | 10    |
| Negative        | 8     |
| Edge Case       | 8     |
| Security        | 4     |
| Error Handling  | 3     |

**Total test cases:** 33

---

## Automated tests

Automated tests mirror these cases and live under `tests/`:

| Area | File | Coverage |
|------|------|----------|
| API search-and-apply | `tests/api/search-and-apply.test.js` | TC-API-001–006, TC-TAG-001–002, TC-EDGE-001, TC-SEC-002, TC-SEC-004, TC-API-005 |
| API evaluate | `tests/api/evaluate.test.js` | TC-API-007, reject missing PDF |
| Routes & security | `tests/routes.test.js` | TC-ROUTE-001–002, TC-SEC-003 |
| Unit: job search | `tests/unit/job_search_service.test.js` | TC-TAG-001–003, TC-UI-004 |
| Unit: sheet tracker | `tests/unit/sheet_tracker.test.js` | TC-SHEET-001–002 |
| Unit: Drive | `tests/unit/drive_upload.test.js` | TC-DRIVE-001 |
| Unit: pipeline & ATS | `tests/unit/career_agent_pipeline.test.js`, `tests/unit/ats_score.test.js` | TC-EDGE-002 |

Run all: `npm test`. Run with coverage: `npm run test:coverage`.

Use this document for manual execution or as a checklist. Prioritize TC-API-002, TC-API-003, TC-API-006, TC-SEC-001, TC-SEC-002, and TC-API-005 for security and robustness.
