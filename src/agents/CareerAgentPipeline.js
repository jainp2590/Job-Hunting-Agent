class CareerAgentPipeline {
  constructor(options = {}) {
    const default_options = {
      match_threshold: 70,
    };

    this.options = { ...default_options, ...options };
  }

  processJob(user_profile, job_posting) {
    const profile = this.normalizeProfile(user_profile);
    const job = this.normalizeJob(job_posting);

    const match_score = this.computeMatchScore(profile, job);
    const decision = this.getDecision(match_score);

    const reasoning = this.buildReasoning(profile, job, match_score);
    const resume_suggestions = this.buildResumeSuggestions(profile, job);
    const cover_letter = this.buildCoverLetter(profile, job, reasoning);

    return {
      job_match_score: match_score,
      decision,
      reasoning,
      resume_optimization_suggestions: resume_suggestions,
      cover_letter_draft: cover_letter,
    };
  }

  normalizeProfile(user_profile) {
    const summary_text = user_profile.summary || "";
    const headline_text = user_profile.headline || "";

    const raw_text = `${summary_text} ${headline_text}`.trim();

    const skills = this.normalizeList(user_profile.skills || []);

    const experiences = (user_profile.experiences || []).map((item) => {
      const title = (item.title || "").toLowerCase();
      const company = (item.company || "").toLowerCase();
      const description = (item.description || "").toLowerCase();
      const technologies = this.normalizeList(item.technologies || []);
      const years = item.years || 0;

      return {
        title,
        company,
        description,
        technologies,
        years,
      };
    });

    const descriptions_text = experiences
      .map((item) => item.description)
      .join(" ");

    const all_text = [
      raw_text.toLowerCase(),
      skills.join(" "),
      descriptions_text,
    ].join(" ");

    const seniority_level = this.estimateSeniorityFromProfile(
      experiences,
      all_text
    );

    return {
      raw_text,
      skills,
      experiences,
      all_text,
      seniority_level,
    };
  }

  normalizeJob(job_posting) {
    const job_title = (job_posting.title || "").trim();
    const company_name = (job_posting.company_name || "").trim();
    const location = (job_posting.location || "").trim();

    const description_text = this.normalizeDescriptionText(
      job_posting.description || ""
    );

    const required_skills = this.extractJobSkills(description_text);
    const nice_to_have_skills = this.extractNiceToHaveSkills(
      description_text
    );

    const seniority_level = this.estimateSeniorityFromJob(
      job_title.toLowerCase(),
      description_text
    );

    return {
      job_title,
      company_name,
      location,
      description_text,
      required_skills,
      nice_to_have_skills,
      seniority_level,
    };
  }

  normalizeList(raw_list) {
    return raw_list
      .map((item) => (item || "").toLowerCase().trim())
      .filter((item) => item.length > 0);
  }

  computeMatchScore(profile, job) {
    const skill_score = this.computeSkillScore(profile, job);
    const seniority_score = this.computeSeniorityScore(
      profile.seniority_level,
      job.seniority_level
    );

    const combined_score = (skill_score * 0.7) + (seniority_score * 0.3);

    const clamped_score = Math.max(0, Math.min(100, combined_score));

    return Math.round(clamped_score);
  }

  computeSkillScore(profile, job) {
    const profile_skills = new Set(profile.skills);

    const required_skills = job.required_skills;
    const nice_to_have_skills = job.nice_to_have_skills;

    if (required_skills.length === 0 && nice_to_have_skills.length === 0) {
      return 70;
    }

    const total_required = required_skills.length || 1;
    const total_nice = nice_to_have_skills.length || 1;

    const matched_required = required_skills.filter((skill) => {
      return profile_skills.has(skill);
    });

    const matched_nice = nice_to_have_skills.filter((skill) => {
      return profile_skills.has(skill);
    });

    const required_ratio = matched_required.length / total_required;
    const nice_ratio = matched_nice.length / total_nice;

    const base_score = (required_ratio * 80) + (nice_ratio * 20);

    return Math.round(base_score);
  }

  computeSeniorityScore(profile_level, job_level) {
    if (!job_level) {
      return 80;
    }

    if (profile_level === job_level) {
      return 100;
    }

    if (profile_level === "senior" && job_level === "mid") {
      return 90;
    }

    if (profile_level === "mid" && job_level === "junior") {
      return 85;
    }

    if (profile_level === "mid" && job_level === "senior") {
      return 70;
    }

    if (profile_level === "junior" && job_level === "mid") {
      return 60;
    }

    if (profile_level === "junior" && job_level === "senior") {
      return 40;
    }

    return 70;
  }

  estimateSeniorityFromProfile(experiences, all_text) {
    const total_years = experiences
      .map((item) => item.years || 0)
      .reduce((sum, value) => sum + value, 0);

    if (total_years >= 7) {
      return "senior";
    }

    if (total_years >= 3) {
      return "mid";
    }

    if (total_years > 0) {
      return "junior";
    }

    const normalized_text = all_text.toLowerCase();

    if (normalized_text.includes("staff engineer")) {
      return "senior";
    }

    if (normalized_text.includes("principal engineer")) {
      return "senior";
    }

    if (normalized_text.includes("senior engineer")) {
      return "senior";
    }

    if (normalized_text.includes("intern")) {
      return "junior";
    }

    return "mid";
  }

  estimateSeniorityFromJob(job_title, description_text) {
    if (job_title.includes("staff")) {
      return "senior";
    }

    if (job_title.includes("principal")) {
      return "senior";
    }

    if (job_title.includes("senior")) {
      return "senior";
    }

    if (job_title.includes("lead")) {
      return "senior";
    }

    if (job_title.includes("junior")) {
      return "junior";
    }

    if (job_title.includes("intern")) {
      return "junior";
    }

    if (description_text.includes("7+ years")) {
      return "senior";
    }

    if (description_text.includes("5+ years")) {
      return "senior";
    }

    if (description_text.includes("2+ years")) {
      return "mid";
    }

    if (description_text.includes("3+ years")) {
      return "mid";
    }

    return "mid";
  }

  normalizeDescriptionText(raw_description) {
    const lower = (raw_description || "").toLowerCase();

    return lower
      .replace(/node[\s-]?js/g, "node.js")
      .replace(/full[\s-]?stack/g, "full stack");
  }

  extractJobSkills(description_text) {
    const known_skills = [
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
      "ci/cd",
      "backend",
      "full stack",
      "ai",
      "machine learning",
    ];

    return known_skills.filter((skill) => {
      return description_text.includes(skill);
    });
  }

  extractNiceToHaveSkills(description_text) {
    const nice_skills = [
      "python",
      "java",
      "go",
      "rust",
      "kafka",
      "rabbitmq",
      "gcp",
      "azure",
    ];

    return nice_skills.filter((skill) => {
      return description_text.includes(skill);
    });
  }

  getDecision(match_score) {
    if (match_score >= this.options.match_threshold) {
      return "Apply";
    }

    return "Skip";
  }

  buildReasoning(profile, job, match_score) {
    const profile_skills = new Set(profile.skills);

    const key_matching_skills = job.required_skills.filter((skill) => {
      return profile_skills.has(skill);
    });

    const missing_skills = job.required_skills.filter((skill) => {
      return !profile_skills.has(skill);
    });

    const seniority_alignment = this.describeSeniorityAlignment(
      profile.seniority_level,
      job.seniority_level
    );

    return {
      job_match_score: match_score,
      key_matching_skills,
      missing_skills,
      seniority_alignment,
    };
  }

  describeSeniorityAlignment(profile_level, job_level) {
    if (!job_level) {
      return "Job seniority is not clearly specified.";
    }

    if (profile_level === job_level) {
      return `Profile seniority (${profile_level}) matches job seniority ` +
        `(${job_level}).`;
    }

    if (profile_level === "senior" && job_level === "mid") {
      return "Profile seniority is above the role (senior vs mid).";
    }

    if (profile_level === "mid" && job_level === "senior") {
      return "Profile seniority is slightly below the role (mid vs senior).";
    }

    return `Profile seniority (${profile_level}) differs from job ` +
      `seniority (${job_level}).`;
  }

  buildResumeSuggestions(profile, job) {
    const profile_skills = new Set(profile.skills);

    const missing_required = job.required_skills.filter((skill) => {
      return !profile_skills.has(skill);
    });

    const suggestions = [];

    if (missing_required.length > 0) {
      const missing_list = missing_required.join(", ");

      suggestions.push(
        "Highlight any real experience you have with: " +
          `${missing_list}. Do not add them if you ` +
          "have never used them."
      );
    }

    const job_keywords = this.extractJobKeywords(job.description_text);

    const existing_keywords = this.filterExistingKeywords(
      job_keywords,
      profile.all_text
    );

    if (existing_keywords.length > 0) {
      const keyword_list = existing_keywords.join(", ");

      suggestions.push(
        "Emphasize these terms already present in your experience section: " +
          keyword_list +
          "."
      );
    }

    if (suggestions.length === 0) {
      suggestions.push(
        "Your resume already aligns well. Consider reordering bullets to " +
          "prioritize the most relevant projects for this role."
      );
    }

    return suggestions;
  }

  extractJobKeywords(description_text) {
    const keyword_candidates = [
      "microservices",
      "distributed systems",
      "scalability",
      "performance",
      "api design",
      "rest",
      "graphql",
      "mysql",
      "redis",
      "node.js",
      "javascript",
      "typescript",
      "cloud",
      "aws",
      "ci/cd",
      "test automation",
      "unit testing",
    ];

    return keyword_candidates.filter((keyword) => {
      return description_text.includes(keyword);
    });
  }

  filterExistingKeywords(keyword_list, profile_text) {
    const normalized_text = profile_text.toLowerCase();

    return keyword_list.filter((keyword) => {
      return normalized_text.includes(keyword);
    });
  }

  buildCoverLetter(profile, job, reasoning) {
    const job_title = job.job_title || "the role";
    const company_name = job.company_name || "your company";

    const key_skills_list = reasoning.key_matching_skills
      .slice(0, 4)
      .join(", ");

    const seniority_phrase = this.getSeniorityPhrase(
      profile.seniority_level
    );

    const opening_line = this.buildCoverLetterOpeningLine(
      job_title,
      company_name,
      seniority_phrase,
      key_skills_list
    );

    const middle_paragraph = this.buildCoverLetterMiddleParagraph();
    const closing_paragraph = this.buildCoverLetterClosingParagraph(
      company_name
    );

    return [
      "Dear Hiring Manager,",
      "",
      opening_line,
      "",
      middle_paragraph,
      "",
      closing_paragraph,
      "",
      "Best regards,",
      "<Your Name>",
    ].join("\n");
  }

  getSeniorityPhrase(seniority_level) {
    if (seniority_level === "senior") {
      return "senior software engineer";
    }

    if (seniority_level === "mid") {
      return "software engineer";
    }

    return "junior software engineer";
  }

  buildCoverLetterOpeningLine(
    job_title,
    company_name,
    seniority_phrase,
    key_skills_list
  ) {
    const core_text =
      `I am excited to apply for the ${job_title} position at ` +
      `${company_name}. With my background as a ${seniority_phrase}, `;

    const skills_text = key_skills_list
      ? `I have worked extensively with ${key_skills_list} `
      : "I have worked extensively with technologies that are closely ";

    const tail_text =
      "aligned with the requirements of this role.";

    return core_text + skills_text + tail_text;
  }

  buildCoverLetterMiddleParagraph() {
    return (
      "Across my recent experience, I have focused on delivering reliable, " +
      "maintainable, and high-performance systems. I prioritize clear " +
      "architecture, thoughtful trade-offs, and strong collaboration with " +
      "product and design stakeholders to ship features that matter."
    );
  }

  buildCoverLetterClosingParagraph(company_name) {
    return (
      "I would welcome the opportunity to discuss how my experience can " +
      `contribute to ${company_name}'s goals and roadmap.`
    );
  }
}

module.exports = {
  CareerAgentPipeline,
};

