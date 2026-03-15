const { extractKeywords } = require("./ats_score");

function buildOptimizedSummary(resume_text, job_description, suggestions) {
  if (!resume_text || !job_description) {
    return "";
  }

  const keywords = extractKeywords(job_description);
  const resume_lower = resume_text.toLowerCase();
  const matched = keywords.filter((kw) => resume_lower.includes(kw));
  const unmatched = keywords.filter((kw) => !resume_lower.includes(kw));

  const parts = [];

  if (matched.length > 0) {
    parts.push(
      "Keywords from job already in your resume: " + matched.slice(0, 15).join(", ")
    );
  }

  if (unmatched.length > 0) {
    parts.push(
      "Consider adding if accurate: " + unmatched.slice(0, 10).join(", ")
    );
  }

  if (suggestions && suggestions.length > 0) {
    parts.push("Resume tweaks: " + suggestions.join(" "));
  }

  return parts.join(". ");
}

module.exports = {
  buildOptimizedSummary,
};
