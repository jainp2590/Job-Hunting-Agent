const PDFDocument = require("pdfkit");

function getValidPdfBuffer() {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.fontSize(10).text("Sample resume text. 5 years experience. Node.js.", 50, 50);
    doc.end();
  });
}

module.exports = {
  getValidPdfBuffer,
};
