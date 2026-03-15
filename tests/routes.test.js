const request = require("supertest");

jest.mock("../src/services/job_search_service", () => ({
  ...jest.requireActual("../src/services/job_search_service"),
  searchJobs: jest.fn(() => Promise.resolve([])),
}));
jest.mock("pdf-parse", () =>
  jest.fn(() => Promise.resolve({ text: "Sample resume text." }))
);

const app = require("../src/server");

describe("Routes (TC-ROUTE-001, TC-ROUTE-002, TC-SEC-003)", () => {
  test("TC-ROUTE-001: GET / returns HTML", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Job Hunting Agent/);
    expect(res.text).toMatch(/form/);
  });

  test("TC-ROUTE-001: GET /index.html returns HTML", async () => {
    const res = await request(app).get("/index.html");
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/form/);
  });

  test("TC-ROUTE-002: GET /api/search-and-apply returns 404 or 405", async () => {
    const res = await request(app).get("/api/search-and-apply");
    expect([404, 405]).toContain(res.status);
  });

  test("TC-SEC-003: POST /api/search-and-apply with JSON body – no file parsed", async () => {
    const res = await request(app)
      .post("/api/search-and-apply")
      .set("Content-Type", "application/json")
      .send({ tags: "Node.js", resume_pdf: "base64..." });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Resume PDF is required/i);
  });
});
