const { calculateAtsScore } = require("../../src/utils/ats_score");

describe("ATS score", () => {
  test("Returns 0 when resume or job empty", () => {
    expect(calculateAtsScore("", "job desc")).toBe(0);
    expect(calculateAtsScore("resume", "")).toBe(0);
  });

  test("Returns score 0-100 when both have content", () => {
    const resume = "Node.js JavaScript MySQL experience.";
    const job = "We need Node.js and JavaScript. MySQL required.";
    const score = calculateAtsScore(resume, job);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
