require("dotenv").config();
const path = require("path");
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { CareerAgentPipeline } = require("./agents/CareerAgentPipeline");
const {
  GoogleSheetsJobApplicationTracker,
} = require("./tracking/google_sheets_job_application_tracker");
const {
  searchJobs,
  normalizeTags,
  buildSearchQueryFromTags,
} = require("./services/job_search_service");
const {
  saveResumeLocally,
  getResumeDirForStatic,
} = require("./utils/local_resume_save");
const { calculateAtsScore } = require("./utils/ats_score");
const { buildOptimizedSummary } = require("./utils/resume_optimizer");
const { buildModifiedResumeText } = require("./utils/resume_modifier");
const { buildPdfBuffer } = require("./utils/resume_to_pdf");
const logger = require("./utils/logger");

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const is_pdf =
      file.mimetype === "application/pdf" ||
      (file.originalname || "").toLowerCase().endsWith(".pdf");
    cb(null, is_pdf);
  },
});

app.use(express.json({ limit: "2mb" }));

const KNOWN_SKILLS = [
  "javascript",
  "node.js",
  "node",
  "typescript",
  "react",
  "mysql",
  "postgresql",
  "redis",
  "aws",
  "docker",
  "kubernetes",
  "express",
  "knex",
  "graphql",
  "rest",
  "python",
  "java",
  "go",
  "ci/cd",
];

function extractSkillsFromText(text) {
  if (!text || typeof text !== "string") {
    return [];
  }
  const lower = text.toLowerCase();
  return KNOWN_SKILLS.filter((skill) => lower.includes(skill));
}

function extractYearsFromText(text) {
  if (!text || typeof text !== "string") {
    return 0;
  }
  const patterns = [
    /(\d+)\s*\+?\s*years?\s+(?:of\s+)?(?:experience|exp)/i,
    /(\d+)\s*\+?\s*years?/i,
    /experience[:\s]+(\d+)/i,
    /(\d+)\s*yoe/i,
  ];
  let max_years = 0;
  for (const re of patterns) {
    const match = text.match(re);
    if (match) {
      const val = parseInt(match[1], 10);
      if (!Number.isNaN(val)) {
        max_years = Math.max(max_years, val);
      }
    }
  }
  return max_years;
}

function extractRoleTitleFromText(text) {
  if (!text || typeof text !== "string") {
    return "Software Engineer";
  }
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const title_keywords = [
    "engineer",
    "developer",
    "architect",
    "manager",
    "lead",
    "analyst",
  ];
  for (const line of lines) {
    if (line.length > 5 && line.length < 80) {
      const lower = line.toLowerCase();
      if (title_keywords.some((k) => lower.includes(k))) {
        return line;
      }
    }
  }
  if (lines.length > 0 && lines[0].length < 80) {
    return lines[0];
  }
  return "Software Engineer";
}

function buildProfileFromResumeText(resume_text) {
  const role_title = extractRoleTitleFromText(resume_text);
  const years = extractYearsFromText(resume_text);
  const skills = extractSkillsFromText(resume_text);

  return {
    summary: resume_text,
    headline: role_title,
    skills,
    experiences: [
      {
        title: role_title,
        company: "",
        description: resume_text,
        technologies: skills,
        years: years || 1,
      },
    ],
  };
}

function buildJobFromFormFields(fields) {
  return {
    title: fields.job_title || "",
    company_name: fields.company_name || "",
    location: fields.location || "",
    description: fields.job_description || "",
  };
}

app.post("/api/evaluate", upload.single("resume_pdf"), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      res.status(400).json({
        success: false,
        error: "Resume PDF is required.",
      });
      return;
    }

    const pdf_result = await pdfParse(req.file.buffer);
    const text = (pdf_result && pdf_result.text) ? pdf_result.text : "";

    if (!text.trim()) {
      res.status(400).json({
        success: false,
        error: "Could not extract text from the PDF.",
      });
      return;
    }

    const form = req.body || {};
    const user_profile = buildProfileFromResumeText(text);

    const job_posting = buildJobFromFormFields({
      job_title: form.job_title,
      company_name: form.company_name,
      location: form.location,
      job_description: form.job_description,
    });

    const pipeline = new CareerAgentPipeline({ match_threshold: 75 });
    const result = pipeline.processJob(user_profile, job_posting);

    const sheet_url = (form.sheet_url || "").trim();
    if (sheet_url) {
      const sheet_id =
        GoogleSheetsJobApplicationTracker.parseSheetIdFromUrl(
          sheet_url
        );
      if (sheet_id) {
        const tracker = new GoogleSheetsJobApplicationTracker({
          sheet_id,
        });
        try {
          await tracker.recordApplication(job_posting, result);
          logger.info("evaluate: sheet row appended");
        } catch (sheet_err) {
          logger.error("evaluate: sheet recordApplication failed", sheet_err);
          throw sheet_err;
        }
      } else {
        logger.warn("evaluate: could not parse sheet_id from URL", sheet_url);
      }
    }

    res.json({
      success: true,
      job_match_score: result.job_match_score,
      decision: result.decision,
      reasoning: result.reasoning,
      resume_optimization_suggestions:
        result.resume_optimization_suggestions,
      cover_letter_draft: result.cover_letter_draft,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Evaluation failed",
    });
  }
});

app.post(
  "/api/search-and-apply",
  upload.single("resume_pdf"),
  async (req, res) => {
    try {
      if (!req.file || !req.file.buffer) {
        res.status(400).json({
          success: false,
          error: "Resume PDF is required.",
        });
        return;
      }

      const form = req.body || {};
      const tags_raw = form.tags || form.designation || "";
      const tags = normalizeTags(
        typeof tags_raw === "string" ? tags_raw : String(tags_raw)
      );
      if (tags.length === 0) {
        res.status(400).json({
          success: false,
          error: "At least one tag is required (e.g. Node.js, Remote). Up to 10.",
        });
        return;
      }

      const pdf_result = await pdfParse(req.file.buffer);
      const resume_text =
        (pdf_result && pdf_result.text) ? pdf_result.text : "";

      if (!resume_text.trim()) {
        res.status(400).json({
          success: false,
          error: "Could not extract text from the PDF.",
        });
        return;
      }

      const user_profile = buildProfileFromResumeText(resume_text);
      const pipeline = new CareerAgentPipeline({ match_threshold: 75 });

      const jobs = await searchJobs(tags);
      logger.info("search-and-apply: jobs found", jobs.length);

      const sheet_url = (form.sheet_url || "").trim() || process.env.JOB_AGENT_SHEET_URL;
      if (!sheet_url) {
        logger.warn(
          "search-and-apply: no sheet_url in request; sheet will not be updated"
        );
      }
      let tracker = null;
      const sheet_id =
        sheet_url
          ? GoogleSheetsJobApplicationTracker.parseSheetIdFromUrl(sheet_url)
          : "";
      if (sheet_url && sheet_id) {
        tracker = new GoogleSheetsJobApplicationTracker({ sheet_id });
        logger.info("search-and-apply: sheet tracker ready, sheet_id", sheet_id);
      } else if (sheet_url && !sheet_id) {
        logger.warn(
          "search-and-apply: could not parse sheet_id from URL; sheet will not be updated"
        );
      }

      const credentials_set = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (!credentials_set) {
        logger.warn(
          "GOOGLE_APPLICATION_CREDENTIALS not set; Sheet updates will fail"
        );
      }

      const results = [];

      for (const job of jobs) {
        const job_posting = {
          title: job.title,
          company_name: job.company_name,
          location: job.location,
          description: job.description,
          url: job.url,
        };

        const result = pipeline.processJob(user_profile, job_posting);
        const ats_score = calculateAtsScore(
          resume_text,
          job_posting.description
        );
        const optimized_notes = buildOptimizedSummary(
          resume_text,
          job_posting.description,
          result.resume_optimization_suggestions
        );

        let modified_resume_link = "";
        try {
          const modified_text = buildModifiedResumeText(
            resume_text,
            job_posting,
            result.reasoning
          );
          const pdf_buffer = await buildPdfBuffer(modified_text);
          const company_part = job_posting.company_name || "Company";
          const title_part = job_posting.title || "Role";
          const file_name = `Resume_${company_part}_${title_part}`;
          modified_resume_link = saveResumeLocally(pdf_buffer, file_name);
          logger.debug(
            "Resume saved locally:",
            job_posting.company_name,
            modified_resume_link
          );
        } catch (save_err) {
          logger.error(
            "Local resume save failed for",
            job_posting.company_name,
            job_posting.title,
            save_err
          );
          modified_resume_link = "";
        }

        const enriched_result = {
          ...result,
          ats_score,
          resume_optimization_notes: optimized_notes,
          modified_resume_link,
        };

        if (tracker) {
          try {
            await tracker.recordApplication(
              job_posting,
              enriched_result
            );
            logger.debug("Sheet row appended:", job_posting.company_name);
          } catch (sheet_err) {
            logger.error(
              "Sheet recordApplication failed for",
              job_posting.company_name,
              sheet_err
            );
          }
        }

        results.push({
          job_title: job_posting.title,
          company_name: job_posting.company_name,
          location: job_posting.location,
          job_url: job_posting.url,
          job_match_score: result.job_match_score,
          ats_score,
          decision: result.decision,
          reasoning: result.reasoning,
          resume_optimization_suggestions:
            result.resume_optimization_suggestions,
          cover_letter_draft: result.cover_letter_draft,
          modified_resume_link,
        });
      }

      res.json({
        success: true,
        tags,
        search_query: buildSearchQueryFromTags(tags),
        total_jobs: results.length,
        results,
      });
    } catch (error) {
      logger.error("search-and-apply failed", error);
      res.status(500).json({
        success: false,
        error: error.message || "Search and apply failed",
      });
    }
  }
);

app.use("/resumes", express.static(getResumeDirForStatic()));
app.use(express.static(path.join(__dirname, "..", "public")));

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info("Job Hunting Agent server at http://localhost:" + PORT);
    logger.info(
      "GOOGLE_APPLICATION_CREDENTIALS:",
      process.env.GOOGLE_APPLICATION_CREDENTIALS ? "set" : "not set"
    );
  });
}

module.exports = app;
