const fs = require("fs");
const path = require("path");

const DEFAULT_RESUME_DIR = path.join(__dirname, "..", "..", "data", "resumes");

function sanitizeFileName(name) {
  return (name || "resume")
    .replace(/[^\w\s.-]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 100);
}

function getResumeOutputDir() {
  const dir =
    process.env.RESUME_OUTPUT_DIR ||
    process.env.RESUME_FOLDER ||
    DEFAULT_RESUME_DIR;
  return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
}

function ensureResumeDir(dir_path) {
  if (!fs.existsSync(dir_path)) {
    fs.mkdirSync(dir_path, { recursive: true });
  }
}

/**
 * Saves a PDF buffer to the local resume folder and returns the URL path to serve it.
 * @param {Buffer} pdf_buffer - PDF content
 * @param {string} file_name - Base name (without .pdf)
 * @returns {string} - URL path e.g. /resumes/Resume_Company_Title.pdf
 */
function saveResumeLocally(pdf_buffer, file_name) {
  const dir_path = getResumeOutputDir();
  ensureResumeDir(dir_path);

  const safe_name = sanitizeFileName(file_name) + ".pdf";
  const file_path = path.join(dir_path, safe_name);

  fs.writeFileSync(file_path, pdf_buffer);

  return "/resumes/" + encodeURIComponent(safe_name);
}

function getResumeDirForStatic() {
  return getResumeOutputDir();
}

module.exports = {
  saveResumeLocally,
  getResumeDirForStatic,
  getResumeOutputDir,
  sanitizeFileName,
};
