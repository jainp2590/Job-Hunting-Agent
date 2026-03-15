const JOB_KEYWORDS = [
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
  "graphql",
  "rest",
  "api",
  "microservices",
  "ci/cd",
  "python",
  "java",
  "go",
  "experience",
  "years",
  "senior",
  "engineer",
  "developer",
  "backend",
  "frontend",
  "full stack",
  "agile",
  "scrum",
  "testing",
  "database",
  "sql",
];

function extractKeywords(text) {
  if (!text || typeof text !== "string") {
    return [];
  }
  const lower = text.toLowerCase();
  const found = [];
  for (const kw of JOB_KEYWORDS) {
    if (lower.includes(kw)) {
      found.push(kw);
    }
  }
  const words = lower
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return [...new Set([...found, ...words.filter((w) => w.length > 4)])];
}

function calculateAtsScore(resume_text, job_description) {
  if (!resume_text || !job_description) {
    return 0;
  }

  const job_keywords = extractKeywords(job_description);
  const resume_lower = resume_text.toLowerCase();

  if (job_keywords.length === 0) {
    return 70;
  }

  let match_count = 0;
  for (const kw of job_keywords) {
    if (resume_lower.includes(kw)) {
      match_count += 1;
    }
  }

  const ratio = match_count / job_keywords.length;
  const score = Math.round(Math.min(100, ratio * 100));
  return score;
}

module.exports = {
  calculateAtsScore,
  extractKeywords,
};
