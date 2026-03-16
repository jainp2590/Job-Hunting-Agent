const fs = require("fs");
const path = require("path");

let cachedTemplateHtml = "";

function loadTemplateHtml() {
  if (cachedTemplateHtml) {
    return cachedTemplateHtml;
  }

  const template_path = path.join(
    __dirname,
    "..",
    "..",
    "sample_resume.html"
  );

  try {
    cachedTemplateHtml = fs.readFileSync(template_path, "utf8");
  } catch (err) {
    throw new Error(
      "Could not read sample_resume.html. " +
        "Ensure the file exists in the project root."
    );
  }

  return cachedTemplateHtml;
}

function escapeHtml(text) {
  if (text == null) {
    return "";
  }

  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildSummaryHtml(summary_text) {
  const safe = escapeHtml(summary_text).replace(/\n+/g, "<br>");

  const block =
    '<div class="targeted-summary">' +
    '<span class="pdf24_12 pdf24_08">' +
    safe +
    "</span>" +
    "</div>";

  return block;
}

function buildModifiedResumeHtml(summary_text) {
  const html = loadTemplateHtml();
  const placeholder = "<!-- TARGETED_SUMMARY -->";

  if (!html.includes(placeholder)) {
    // If there is no placeholder, fall back to original template unchanged.
    return html;
  }

  const injected = buildSummaryHtml(summary_text);
  return html.replace(placeholder, injected);
}

module.exports = {
  buildModifiedResumeHtml,
};

