const { google } = require("googleapis");

class GoogleSheetsJobApplicationTracker {
  constructor(options = {}) {
    const default_options = {
      sheet_id: "",
      sheet_name: "Applications",
    };

    this.options = { ...default_options, ...options };
    this.sheets_client = null;
  }

  async recordApplication(job_posting, pipeline_result) {
    if (!this.options.sheet_id) {
      throw new Error("sheet_id is required for GoogleSheetsJobApplicationTracker");
    }

    const should_apply = pipeline_result.decision === "Apply";

    const sheets = await this.getSheetsClient();

    await this.ensureHeaderRow(sheets);

    const row_values = this.buildRowValues(
      job_posting,
      pipeline_result,
      should_apply
    );

    const range = `${this.options.sheet_name}!A:A`;

    await sheets.spreadsheets.values.append({
      spreadsheetId: this.options.sheet_id,
      range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [row_values],
      },
    });
  }

  async getSheetsClient() {
    if (this.sheets_client) {
      return this.sheets_client;
    }

    const auth = await google.auth.getClient({
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    this.sheets_client = google.sheets({ version: "v4", auth });

    return this.sheets_client;
  }

  async ensureHeaderRow(sheets) {
    const range = `${this.options.sheet_name}!A1:I1`;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.options.sheet_id,
      range,
    });

    const values = response.data.values;

    if (values && values.length > 0) {
      return;
    }

    const header_row = [
      "date",
      "company_name",
      "job_title",
      "location",
      "job_match_score",
      "decision",
      "key_matching_skills",
      "missing_skills",
      "seniority_alignment",
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: this.options.sheet_id,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [header_row],
      },
    });
  }

  buildRowValues(job_posting, pipeline_result, should_apply) {
    const reasoning = pipeline_result.reasoning || {};

    const key_matching_skills =
      reasoning.key_matching_skills || [];

    const missing_skills = reasoning.missing_skills || [];

    const seniority_alignment =
      reasoning.seniority_alignment || "";

    const current_date = new Date().toISOString();

    const company_name =
      job_posting.company_name || "";

    const job_title = job_posting.title || "";

    const location = job_posting.location || "";

    const decision_text = should_apply
      ? "Apply"
      : "Skip";

    return [
      current_date,
      company_name,
      job_title,
      location,
      pipeline_result.job_match_score,
      decision_text,
      key_matching_skills.join(", "),
      missing_skills.join(", "),
      seniority_alignment,
    ];
  }

  static parseSheetIdFromUrl(google_sheet_url) {
    if (!google_sheet_url) {
      return "";
    }

    const matches = google_sheet_url.match(
      /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/
    );

    if (!matches || matches.length < 2) {
      return "";
    }

    return matches[1];
  }
}

module.exports = {
  GoogleSheetsJobApplicationTracker,
};

