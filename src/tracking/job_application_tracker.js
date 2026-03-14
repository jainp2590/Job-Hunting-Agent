const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

class JobApplicationTracker {
  constructor(options = {}) {
    const default_options = {
      file_path: path.join(
        process.cwd(),
        "data",
        "job_applications.xlsx"
      ),
    };

    this.options = { ...default_options, ...options };
  }

  recordApplication(job_posting, pipeline_result) {
    const should_apply = pipeline_result.decision === "Apply";

    this.ensureDirectoryExists();

    const workbook = this.loadWorkbook();
    const worksheet_name = "Applications";
    const worksheet = this.ensureWorksheet(workbook, worksheet_name);

    const row_values = this.buildRowValues(
      job_posting,
      pipeline_result,
      should_apply
    );

    this.appendRow(worksheet, row_values);

    xlsx.writeFile(workbook, this.options.file_path);
  }

  ensureDirectoryExists() {
    const directory_path = path.dirname(this.options.file_path);

    if (!fs.existsSync(directory_path)) {
      fs.mkdirSync(directory_path, { recursive: true });
    }
  }

  loadWorkbook() {
    if (fs.existsSync(this.options.file_path)) {
      return xlsx.readFile(this.options.file_path);
    }

    return xlsx.utils.book_new();
  }

  ensureWorksheet(workbook, worksheet_name) {
    const existing_sheet = workbook.Sheets[worksheet_name];

    if (existing_sheet) {
      return existing_sheet;
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

    const worksheet = xlsx.utils.aoa_to_sheet([header_row]);

    xlsx.utils.book_append_sheet(workbook, worksheet, worksheet_name);

    return worksheet;
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

  appendRow(worksheet, row_values) {
    const sheet_range = xlsx.utils.decode_range(
      worksheet["!ref"] || "A1:A1"
    );

    const next_row_index = sheet_range.e.r + 1;

    const row_array = [row_values];

    const updated_sheet = xlsx.utils.sheet_add_aoa(
      worksheet,
      row_array,
      { origin: { r: next_row_index, c: 0 } }
    );

    const updated_range = xlsx.utils.decode_range(
      updated_sheet["!ref"]
    );

    updated_range.e.r = Math.max(
      updated_range.e.r,
      next_row_index
    );

    updated_sheet["!ref"] = xlsx.utils.encode_range(
      updated_range
    );
  }
}

module.exports = {
  JobApplicationTracker,
};

