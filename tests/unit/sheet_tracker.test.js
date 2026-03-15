const {
  GoogleSheetsJobApplicationTracker,
} = require("../../src/tracking/google_sheets_job_application_tracker");

describe("Sheet tracker (TC-SHEET-001)", () => {
  test("TC-SHEET-001: Valid sheet URL returns id", () => {
    const url =
      "https://docs.google.com/spreadsheets/d/ABC123xyz/edit#gid=0";
    expect(GoogleSheetsJobApplicationTracker.parseSheetIdFromUrl(url)).toBe(
      "ABC123xyz"
    );
  });

  test("TC-SHEET-001: Invalid URLs return empty", () => {
    expect(
      GoogleSheetsJobApplicationTracker.parseSheetIdFromUrl("https://example.com")
    ).toBe("");
    expect(GoogleSheetsJobApplicationTracker.parseSheetIdFromUrl("")).toBe("");
    expect(
      GoogleSheetsJobApplicationTracker.parseSheetIdFromUrl(null)
    ).toBe("");
  });

  test("buildRowValues includes modified_resume_link (TC-SHEET-002)", () => {
    const tracker = new GoogleSheetsJobApplicationTracker({ sheet_id: "x" });
    const job_posting = {
      title: "Engineer",
      company_name: "Co",
      location: "Remote",
      url: "https://job.com",
    };
    const pipeline_result = {
      decision: "Apply",
      job_match_score: 80,
      ats_score: 75,
      reasoning: {
        key_matching_skills: ["Node.js"],
        missing_skills: [],
        seniority_alignment: "Match",
      },
      resume_optimization_suggestions: [],
      cover_letter_draft: "Dear...",
      modified_resume_link: "https://drive.google.com/file/d/abc/view",
    };
    const row = tracker.buildRowValues(
      job_posting,
      pipeline_result,
      true
    );
    expect(row.length).toBe(14);
    expect(row[13]).toBe("https://drive.google.com/file/d/abc/view");
  });
});
