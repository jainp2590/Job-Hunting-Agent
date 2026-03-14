const { CareerAgentPipeline } = require("./agents/CareerAgentPipeline");
const {
  GoogleSheetsJobApplicationTracker,
} = require("./tracking/google_sheets_job_application_tracker");

function buildSampleProfile() {
  const user_profile = {
    summary:
      "Senior Node.js engineer with experience in MySQL and Redis.",
    headline: "Senior Backend Engineer",
    skills: [
      "Node.js",
      "JavaScript",
      "MySQL",
      "Redis",
      "AWS",
    ],
    experiences: [
      {
        title: "Senior Backend Engineer",
        company: "TechCorp",
        description:
          "Designed and built Node.js microservices with MySQL and " +
          "Redis.",
        technologies: [
          "Node.js",
          "MySQL",
          "Redis",
          "Docker",
        ],
        years: 4,
      },
    ],
  };

  return user_profile;
}

function buildSampleJobPosting() {
  const job_posting = {
    title: "Senior Node.js Engineer",
    company_name: "AwesomeStartup",
    location: "Remote",
    description:
      "We are looking for a Senior Node.js Engineer to build scalable " +
      "REST APIs. Must have strong experience with JavaScript, Node.js, " +
      "MySQL, and Redis. Nice to have: AWS, Docker.",
  };

  return job_posting;
}

function runSamplePipeline(google_sheet_url) {
  const pipeline = new CareerAgentPipeline({
    match_threshold: 75,
  });

  const sheet_id =
    GoogleSheetsJobApplicationTracker.parseSheetIdFromUrl(
      google_sheet_url
    );

  const tracker = new GoogleSheetsJobApplicationTracker({
    sheet_id,
  });

  const user_profile = buildSampleProfile();
  const job_posting = buildSampleJobPosting();

  const result = pipeline.processJob(
    user_profile,
    job_posting
  );

  tracker
    .recordApplication(
      job_posting,
      result
    )
    .catch((error) => {
      /* eslint-disable no-console */
      console.error("Failed to record application:", error);
      /* eslint-enable no-console */
    });

  /* eslint-disable no-console */
  console.log("Job Match Score:", result.job_match_score);
  console.log("Decision:", result.decision);
  console.log("Reasoning:", result.reasoning);
  console.log(
    "Resume Optimization Suggestions:",
    result.resume_optimization_suggestions
  );
  console.log("Cover Letter Draft:\n", result.cover_letter_draft);
  /* eslint-enable no-console */
}

if (require.main === module) {
  const google_sheet_url = process.env.JOB_AGENT_SHEET_URL || "";
  runSamplePipeline(google_sheet_url);
}

module.exports = {
  runSamplePipeline,
};

