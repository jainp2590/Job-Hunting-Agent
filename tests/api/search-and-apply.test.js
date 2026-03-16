const request = require("supertest");

jest.mock("pdf-parse", () =>
  jest.fn(() =>
    Promise.resolve({
      text: "Sample resume. 5 years experience. Node.js JavaScript.",
    })
  )
);

jest.mock("../../src/services/job_search_service", () => ({
  ...jest.requireActual("../../src/services/job_search_service"),
  searchJobs: jest.fn(() =>
    Promise.resolve([
      {
        title: "Backend Engineer",
        company_name: "TechCorp",
        location: "Remote",
        description: "Node.js, JavaScript, MySQL.",
        url: "https://example.com/job/1",
      },
    ])
  ),
}));

jest.mock("../../src/utils/resume_to_pdf", () => ({
  buildPdfFromHtml: jest.fn(() =>
    Promise.resolve(Buffer.from("%PDF-1.4 fake html pdf"))
  ),
}));

jest.mock("../../src/utils/local_resume_save", () => ({
  saveResumeLocally: jest.fn(() => "/resumes/Resume_Company_Title.pdf"),
  getResumeDirForStatic: jest.fn(() => require("path").join(__dirname, "..", "..", "data", "resumes")),
}));

const app = require("../../src/server");

const valid_pdf_buffer = Buffer.from("%PDF-1.4 minimal");

describe("POST /api/search-and-apply", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("TC-API-001: Success with PDF + tags", async () => {
    const res = await request(app)
      .post("/api/search-and-apply")
      .field("tags", "Node.js, Remote")
      .attach("resume_pdf", valid_pdf_buffer, "resume.pdf");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.tags)).toBe(true);
    expect(typeof res.body.search_query).toBe("string");
    expect(typeof res.body.total_jobs).toBe("number");
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results.length).toBeGreaterThan(0);
    const first = res.body.results[0];
    expect(first).toHaveProperty("job_title");
    expect(first).toHaveProperty("company_name");
    expect(first).toHaveProperty("job_match_score");
    expect(first).toHaveProperty("ats_score");
    expect(first).toHaveProperty("decision");
    expect(first).toHaveProperty("reasoning");
    expect(first).toHaveProperty("cover_letter_draft");
    expect(first).toHaveProperty("modified_resume_link");
  }, 15000);

  test("TC-API-002: Reject when resume_pdf is missing", async () => {
    const res = await request(app)
      .post("/api/search-and-apply")
      .field("tags", "Node.js");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Resume PDF is required/i);
  });

  test("TC-API-003: Reject when tags normalize to empty", async () => {
    const res = await request(app)
      .post("/api/search-and-apply")
      .field("tags", "   ")
      .field("tags", "  ,  ")
      .attach("resume_pdf", valid_pdf_buffer, "resume.pdf");

    const res2 = await request(app)
      .post("/api/search-and-apply")
      .field("tags", "")
      .attach("resume_pdf", valid_pdf_buffer, "resume.pdf");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/At least one tag is required/i);
    expect(res2.status).toBe(400);
  });

  test("TC-API-004: Reject PDF with no extractable text", async () => {
    const pdfParse = require("pdf-parse");
    pdfParse.mockResolvedValueOnce({ text: "" });

    const res = await request(app)
      .post("/api/search-and-apply")
      .field("tags", "Node.js")
      .attach("resume_pdf", valid_pdf_buffer, "resume.pdf");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Could not extract text/i);
  });

  test("TC-API-006: Reject non-PDF file (multer fileFilter)", async () => {
    const res = await request(app)
      .post("/api/search-and-apply")
      .field("tags", "Node.js")
      .attach("resume_pdf", Buffer.from("not a pdf"), "file.txt");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("TC-TAG-001: Comma and semicolon separators", async () => {
    const res = await request(app)
      .post("/api/search-and-apply")
      .field("tags", "Node.js; JavaScript, MySQL")
      .attach("resume_pdf", valid_pdf_buffer, "resume.pdf");

    expect(res.status).toBe(200);
    expect(res.body.tags).toEqual(
      expect.arrayContaining(["Node.js", "JavaScript", "MySQL"])
    );
  }, 15000);

  test("TC-TAG-002: Tag trimming and empty filter", async () => {
    const res = await request(app)
      .post("/api/search-and-apply")
      .field("tags", "  Node.js  ,  , Remote  ")
      .attach("resume_pdf", valid_pdf_buffer, "resume.pdf");

    expect(res.status).toBe(200);
    expect(res.body.tags).toEqual(
      expect.arrayContaining(["Node.js", "Remote"])
    );
  });

  test("TC-API-005 / TC-EDGE-004: File size and long tags handled", async () => {
    const { searchJobs } = require("../../src/services/job_search_service");
    searchJobs.mockResolvedValueOnce([]);

    const long_tags = Array(12)
      .fill("tag")
      .map((t, i) => t + i)
      .join(", ");
    const res = await request(app)
      .post("/api/search-and-apply")
      .field("tags", long_tags)
      .attach("resume_pdf", valid_pdf_buffer, "resume.pdf");

    expect(res.status).toBe(200);
    expect(res.body.tags.length).toBeLessThanOrEqual(10);
  });

  test("TC-EDGE-001: Zero jobs returns 200 with empty results", async () => {
    const { searchJobs } = require("../../src/services/job_search_service");
    searchJobs.mockResolvedValueOnce([]);

    const res = await request(app)
      .post("/api/search-and-apply")
      .field("tags", "NonexistentRoleXYZ")
      .attach("resume_pdf", valid_pdf_buffer, "resume.pdf");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total_jobs).toBe(0);
    expect(res.body.results).toEqual([]);
  });

  test("TC-API-005: File size over 5 MB rejected", async () => {
    const huge = Buffer.alloc(6 * 1024 * 1024);
    const res = await request(app)
      .post("/api/search-and-apply")
      .field("tags", "Node.js")
      .attach("resume_pdf", huge, "resume.pdf");

    expect([400, 413, 500]).toContain(res.status);
    if (res.body && res.body.error) {
      expect(res.body.error).not.toMatch(/\n\s*at\s/);
      expect(res.body.error.length).toBeLessThan(500);
    }
  });

  test("TC-SEC-004: Error response does not leak stack or paths", async () => {
    const res = await request(app)
      .post("/api/search-and-apply")
      .field("tags", "Node.js");

    expect(res.body.error).toBeDefined();
    expect(res.body.error).not.toMatch(/\n\s*at\s/);
    expect(res.body.error).not.toMatch(/\/home\/|\/Users\//);
  });

  test("TC-SEC-002: XSS in tags – normalized, no execution", async () => {
    const res = await request(app)
      .post("/api/search-and-apply")
      .field("tags", "<script>alert(1)</script>, Node.js")
      .attach("resume_pdf", valid_pdf_buffer, "resume.pdf");

    expect(res.status).toBe(200);
    expect(res.body.tags).toContain("<script>alert(1)</script>");
    expect(res.body.tags).toContain("Node.js");
  });
});
