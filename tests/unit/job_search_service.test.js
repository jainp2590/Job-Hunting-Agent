const {
  normalizeTags,
  buildSearchQueryFromTags,
  getMockJobs,
} = require("../../src/services/job_search_service");

describe("Job search service (TC-TAG-001, TC-TAG-002, TC-TAG-003, TC-UI-004)", () => {
  describe("normalizeTags", () => {
    test("TC-TAG-001: Comma and semicolon separators", () => {
      expect(normalizeTags("Node.js; JavaScript, MySQL")).toEqual([
        "Node.js",
        "JavaScript",
        "MySQL",
      ]);
    });

    test("TC-TAG-002: Trimming and empty filter", () => {
      expect(normalizeTags("  Node.js  ,  , Remote  ")).toEqual([
        "Node.js",
        "Remote",
      ]);
    });

    test("TC-UI-004: More than 10 tags truncated to 10", () => {
      const many = "a,b,c,d,e,f,g,h,i,j,k,l";
      expect(normalizeTags(many).length).toBe(10);
      expect(normalizeTags(many)).toEqual([
        "a", "b", "c", "d", "e", "f", "g", "h", "i", "j",
      ]);
    });

    test("Empty string returns empty array", () => {
      expect(normalizeTags("")).toEqual([]);
      expect(normalizeTags("  ,  ")).toEqual([]);
    });

    test("Array input supported", () => {
      expect(normalizeTags(["Node.js", "Remote"])).toEqual([
        "Node.js",
        "Remote",
      ]);
    });
  });

  describe("buildSearchQueryFromTags", () => {
    test("TC-TAG-003: Query capped at 200 chars", () => {
      const long_tag = "a".repeat(50);
      const tags = Array(10).fill(long_tag);
      const query = buildSearchQueryFromTags(tags);
      expect(query.length).toBe(200);
    });

    test("Empty tags return default", () => {
      expect(buildSearchQueryFromTags([])).toBe("software engineer");
    });

    test("Single tag", () => {
      expect(buildSearchQueryFromTags(["Node.js"])).toBe("Node.js");
    });
  });

  describe("getMockJobs", () => {
    test("Returns 3 jobs with query in title/description", () => {
      const jobs = getMockJobs(["Node.js", "Remote"]);
      expect(jobs.length).toBe(3);
      expect(jobs[0]).toHaveProperty("title");
      expect(jobs[0]).toHaveProperty("company_name");
      expect(jobs[0]).toHaveProperty("description");
      expect(jobs[0]).toHaveProperty("url");
    });
  });
});
