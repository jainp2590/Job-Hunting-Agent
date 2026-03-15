const PDFDocument = require("pdfkit");

function buildPdfBuffer(text) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const line_height = 18;
    const page_height = 792;
    const bottom_margin = 80;
    let y = 50;

    const lines = (text || "").split(/\r?\n/);

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (y + line_height > page_height - bottom_margin) {
        doc.addPage({ size: "A4" });
        y = 50;
      }
      doc.fontSize(10).text(line, 50, y, { width: 495 });
      y += line_height;
    }

    doc.end();
  });
}

module.exports = {
  buildPdfBuffer,
};
