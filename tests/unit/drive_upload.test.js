const { sanitizeFileName } = require("../../src/utils/local_resume_save");

describe("Local resume save (TC-DRIVE-001)", () => {
  test("TC-DRIVE-001: File name sanitization – special chars", () => {
    expect(sanitizeFileName("Test & Co.")).not.toMatch(/&/);
    expect(sanitizeFileName("Dev/Ops")).not.toMatch(/\//);
    expect(sanitizeFileName("Resume_Test___Co.")).toBe("Resume_Test___Co.");
  });

  test("Null/undefined fallback to resume", () => {
    expect(sanitizeFileName(null)).toBe("resume");
    expect(sanitizeFileName(undefined)).toBe("resume");
  });

  test("Long name truncated to 100 chars", () => {
    const long = "a".repeat(150);
    expect(sanitizeFileName(long).length).toBe(100);
  });
});
