const request = require("supertest");

jest.mock("pdf-parse", () =>
  jest.fn(() =>
    Promise.resolve({
      text: "Senior Backend Engineer. Node.js, MySQL, Redis. 5 years.",
    })
  )
);

const app = require("../../src/server");

const valid_pdf_buffer = Buffer.from("%PDF-1.4 minimal");

describe("POST /api/evaluate", () => {
  test("TC-API-007: Evaluate single job with PDF and job fields", async () => {
    const res = await request(app)
      .post("/api/evaluate")
      .field("job_title", "Senior Node.js Engineer")
      .field("company_name", "TechCorp")
      .field("location", "Remote")
      .field("job_description", "Node.js, JavaScript, MySQL, Redis. 5+ years.")
      .attach("resume_pdf", valid_pdf_buffer, "resume.pdf");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("job_match_score");
    expect(res.body).toHaveProperty("decision");
    expect(res.body).toHaveProperty("reasoning");
    expect(res.body).toHaveProperty("resume_optimization_suggestions");
    expect(res.body).toHaveProperty("cover_letter_draft");
    expect(typeof res.body.job_match_score).toBe("number");
    expect(["Apply", "Skip"]).toContain(res.body.decision);
  });

  test("Reject when resume_pdf is missing", async () => {
    const res = await request(app)
      .post("/api/evaluate")
      .field("job_title", "Engineer")
      .field("company_name", "Co")
      .field("job_description", "Skills.");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Resume PDF is required/i);
  });
});
