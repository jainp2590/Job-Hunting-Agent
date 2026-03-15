function buildTargetedSummary(resume_text, job_posting, reasoning) {
  const job_title = job_posting.title || "this role";
  const company = job_posting.company_name || "the company";
  const matching_skills = reasoning?.key_matching_skills || [];
  const resume_lower = resume_text.toLowerCase();

  const parts = [];

  parts.push(
    `Targeted for ${job_title} at ${company}. `
  );

  if (matching_skills.length > 0) {
    const skills_phrase = matching_skills.slice(0, 6).join(", ");
    parts.push(
      `Relevant experience and skills from my background: ${skills_phrase}. `
    );
  }

  const first_chunk = resume_text.trim().slice(0, 300);
  if (first_chunk && resume_lower.includes("experience")) {
    parts.push(
      "Below is my full resume with detailed experience and qualifications."
    );
  } else {
    parts.push("Below is my full resume.");
  }

  return parts.join("");
}

function buildModifiedResumeText(resume_text, job_posting, reasoning) {
  if (!resume_text || !job_posting) {
    return resume_text || "";
  }

  const summary = buildTargetedSummary(
    resume_text,
    job_posting,
    reasoning
  );

  const separator =
    "\n\n--- Tailored for this application ---\n\n";
  const full_text = summary + separator + resume_text.trim();
  return full_text;
}

module.exports = {
  buildModifiedResumeText,
  buildTargetedSummary,
};
