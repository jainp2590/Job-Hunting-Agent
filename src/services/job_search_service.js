const JSEARCH_HOST = process.env.JSEARCH_HOST || "jsearch.p.rapidapi.com";

function buildSearchQueryFromTags(tags) {
  const list = Array.isArray(tags) ? tags : [tags];
  const trimmed = list
    .map((t) => (t && String(t).trim()))
    .filter(Boolean);
  return trimmed.join(" ").slice(0, 200) || "software engineer";
}

async function searchWithJSearch(tags, api_key, page) {
  const query = encodeURIComponent(buildSearchQueryFromTags(tags));
  const page_number = page || 1;
  const url =
    `https://${JSEARCH_HOST}/search?query=${query}` +
    `&page=${page_number}&num_pages=1`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": api_key,
      "X-RapidAPI-Host": JSEARCH_HOST,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Job search failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  const now_ms = Date.now();
  const jobs = (data.data || []).map((job) => {
    let posted_at_ms = null;
    if (job.job_posted_at_timestamp) {
      posted_at_ms = Number(job.job_posted_at_timestamp) * 1000;
    } else if (job.job_posted_at_datetime_utc) {
      const parsed = Date.parse(job.job_posted_at_datetime_utc);
      if (!Number.isNaN(parsed)) {
        posted_at_ms = parsed;
      }
    }

    return {
      title: job.job_title || "",
      company_name: job.employer_name || "",
      location: [
        job.job_city,
        job.job_state,
        job.job_country,
      ].filter(Boolean).join(", "),
      description: job.job_description || "",
      url: job.job_apply_link || job.job_google_link || "",
      posted_at_ms,
      fetched_at_ms: now_ms,
    };
  });

  return jobs;
}

function getMockJobs(tags) {
  const query = buildSearchQueryFromTags(tags);
  const title = query || "Software Engineer";
  return [
    {
      title: `${title} - Backend`,
      company_name: "TechCorp Inc",
      location: "Remote",
      description:
        "We are looking for a " + title + " with Node.js, JavaScript, " +
        "MySQL and Redis. Build scalable APIs. 3+ years experience. " +
        "Nice to have: AWS, Docker.",
      url: "https://example.com/job/1",
    },
    {
      title: `Senior ${title}`,
      company_name: "StartupXYZ",
      location: "San Francisco, CA",
      description:
        "Senior " + title + " needed. Must have: JavaScript, Node.js, " +
        "REST APIs, MySQL. 5+ years. Redis, AWS preferred.",
      url: "https://example.com/job/2",
    },
    {
      title: title,
      company_name: "RemoteFirst Co",
      location: "Remote",
      description:
        title + " to join our team. Skills: Node.js, TypeScript, " +
        "PostgreSQL, Docker. Experience with microservices.",
      url: "https://example.com/job/3",
    },
  ];
}

async function searchJobs(tags, options = {}) {
  const api_key = options.api_key || process.env.RAPIDAPI_KEY;
  const use_mock = options.use_mock === true || !api_key;
  const page_opt = Number.isInteger(options.page) &&
    options.page >= 0 ? options.page : 0;
  const api_page = page_opt + 1;
  const tag_list = normalizeTags(tags);

  if (use_mock) {
    return getMockJobs(tag_list);
  }

  const jobs = await searchWithJSearch(tag_list, api_key, api_page);
  return jobs;
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags
      .map((t) => (t && String(t).trim()))
      .filter(Boolean)
      .slice(0, 10);
  }
  if (typeof tags === "string") {
    return tags
      .split(/[,;]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10);
  }
  return [];
}

module.exports = {
  searchJobs,
  getMockJobs,
  buildSearchQueryFromTags,
  normalizeTags,
};
