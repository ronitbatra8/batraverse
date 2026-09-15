/* Invoice / bill PDF generator (A4, black-and-white).
 * Layout: floating top stripes, brand header, bordered centered meta row,
 * bordered sold-by/bill-to, items table, payment + bill summary, footer. */
const PDFDocument = require("pdfkit");

const W = 595.28;
const H = 841.89;
const M = 60;
const CONTENT_W = W - 2 * M; // 475.28
const GAP = 16;

const BLACK = "#000000";
const WHITE = "#ffffff";

const rs = (n) => `Rs. ${Number(n || 0).toFixed(2)}`;

const MONTHS = ["Jan.", "Feb.", "Mar.", "Apr.", "May.", "Jun.", "Jul.", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];

function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function textWidth(doc, text, opts) {
  return doc.widthOfString(text, { font: opts.font || "Helvetica", fontSize: opts.size || 9, characterSpacing: opts.spacing || 0 });
}

function centerText(doc, text, cx, y, opts) {
  doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(opts.size || 9)
    .fillColor(BLACK)
    .text(text, cx - textWidth(doc, text, opts) / 2, y);
}

/* Centers a block that may wrap into multiple centered lines. Returns next y. */
function centerBlock(doc, text, cx, maxW, y, opts) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return y + 13;
  let lines = [""];
  for (const w of words) {
    const cand = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${w}` : w;
    if (doc.widthOfString(cand, { fontSize: opts.size || 9 }) <= maxW) lines[lines.length - 1] = cand;
    else lines.push(w);
  }
  lines.forEach((ln) => {
    centerText(doc, ln, cx, y, opts);
    y += (opts.size || 9) + 4;
  });
  return y;
}

/* Centered small-caps heading. */
function labelC(doc, text, cx, y) {
  doc.font("Helvetica").fontSize(8).fillColor(BLACK);
  const up = text.toUpperCase();
  doc.text(up, cx - textWidth(doc, up, { size: 8, spacing: 1.2 }) / 2, y, { characterSpacing: 1.2 });
}

function buildInvoicePdf(payload) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      info: { Title: `Invoice ${payload.invoiceNo}`, Author: payload.storeName },
    });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    draw(doc, payload);
    doc.end();
  });
}

/* ---------------- items table ---------------- */

const COLUMNS = [
  { key: "idx", x: M, w: 26, align: "left" },
  { key: "name", x: M + 26, w: 185, align: "left" },
  { key: "sku", x: M + 211, w: 66, align: "left" },
  { key: "qty", x: M + 277, w: 34, align: "right" },
  { key: "unitPrice", x: M + 311, w: 50, align: "right" },
  { key: "discount", x: M + 361, w: 50, align: "right" },
  { key: "amount", x: M + 411, w: M + 475 - (M + 411), align: "right" },
];

function cellText(doc, text, col, y, opts) {
  const size = opts && opts.size ? opts.size : 9;
  doc.font(opts && opts.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(size)
    .fillColor((opts && opts.color) || BLACK);
  if (col.align === "right") {
    const tw = doc.widthOfString(text);
    doc.text(text, col.x + col.w - tw, y, { characterSpacing: (opts && opts.spacing) || 0 });
  } else {
    doc.text(text, col.x, y, { width: col.w, characterSpacing: (opts && opts.spacing) || 0 });
  }
}

function drawTableHeader(doc, y) {
  doc.rect(0, y, W, 26).fill(BLACK);
  doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(8);
  for (const col of COLUMNS) {
    const t = col.key === "idx" ? "#" : col.key.replace(/([a-z])([A-Z])/g, "$1 $2").toUpperCase();
    cellText(doc, t, col, y + 9, { color: WHITE, size: 8, bold: true, spacing: 0.8 });
  }
  return y + 26;
}

function drawItemsTable(doc, payload, startY) {
  let y = drawTableHeader(doc, startY);
  payload.items.forEach((it) => {
    const lineH = 24;
    if (y + lineH > H - 150) {
      doc.addPage({ size: "A4", margin: 0 });
      y = drawTableHeader(doc, 0);
    }
    const nameWithOpts = [it.name, it.color, it.size ? `Size ${it.size}` : ""]
      .filter(Boolean).join("  ·  ");
    cellText(doc, String(it.idx), COLUMNS[0], y + 8, { color: BLACK, size: 9 });
    cellText(doc, nameWithOpts, COLUMNS[1], y + 8, { size: 9 });
    cellText(doc, it.sku || "N/A", COLUMNS[2], y + 8, { color: BLACK, size: 8.5 });
    cellText(doc, String(it.qty), COLUMNS[3], y + 8, { size: 9 });
    cellText(doc, rs(it.unitPrice), COLUMNS[4], y + 8, { size: 9 });
    cellText(doc, rs(it.discount), COLUMNS[5], y + 8, { size: 9 });
    cellText(doc, rs(it.amount), COLUMNS[6], y + 8, { size: 9, bold: true });
    doc.strokeColor(BLACK).lineWidth(0.8).moveTo(M, y + lineH).lineTo(M + CONTENT_W, y + lineH).stroke();
    y += lineH;
  });
  return y;
}

/* ---------------- titled boxes (payment / bill summary) ---------------- */

function drawTitleBox(doc, x, y, w, title, rows) {
  const headerH = 24;
  const rowH = 22;
  const pad = 12;
  const h = headerH + rows.length * rowH + pad;

  doc.rect(x, y, w, headerH).fill(BLACK);
  doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(8)
    .text(title.toUpperCase(), x + 14, y + 9, { characterSpacing: 1 });

  rows.forEach((row, i) => {
    const ry = y + headerH + i * rowH;
    doc.fillColor(BLACK).font("Helvetica").fontSize(8)
      .text(row.label, x + 14, ry + 9);
    doc.fillColor(BLACK).font(row.bold ? "Helvetica-Bold" : "Helvetica").fontSize(9)
      .text(row.value, x + 14, ry + 8, { width: w - 28, align: "right" });
    if (i > 0) {
      doc.strokeColor(BLACK).lineWidth(0.6).moveTo(x + 10, ry).lineTo(x + w - 10, ry).stroke();
    }
  });

  doc.rect(x, y, w, h).strokeColor(BLACK).lineWidth(1).stroke();
  return h;
}

function draw(doc, payload) {
  const o = payload.order;
  const colW = CONTENT_W / 3;
  const boxW = (CONTENT_W - GAP) / 2; // two side-by-side boxes, even gap between
  const box2X = M + boxW + GAP;

  /* ---------------- header: floating stripes + brand + underline ---------------- */
  doc.rect(0, 14, W, 4).fill(BLACK);
  doc.rect(0, 23, W, 4).fill(BLACK);

  doc.fillColor(BLACK).font("Helvetica-Bold").fontSize(26).text("BATRAVERSE", M, 46);
  const invW = doc.widthOfString("INVOICE", { font: "Helvetica-Bold", fontSize: 18 });
  doc.font("Helvetica-Bold").fontSize(18).fillColor(BLACK).text("INVOICE", W - M - invW, 48);

  const underlineY = 84;
  doc.rect(0, underlineY, W, 2).fill(BLACK);

  /* ---------------- meta: invoice no / order id / order date ---------------- */
  const metaY = underlineY + GAP;
  const metaH = 78;
  doc.strokeColor(BLACK).lineWidth(1)
    .moveTo(M + colW, metaY).lineTo(M + colW, metaY + metaH).stroke();
  doc.strokeColor(BLACK).lineWidth(1)
    .moveTo(M + 2 * colW, metaY).lineTo(M + 2 * colW, metaY + metaH).stroke();
  doc.rect(M, metaY, CONTENT_W, metaH).stroke();

  const c1 = M + colW / 2;
  const c2 = M + colW + colW / 2;
  const c3 = M + 2 * colW + colW / 2;
  labelC(doc, "Invoice No.", c1, metaY + 16);
  labelC(doc, "Order ID", c2, metaY + 16);
  labelC(doc, "Order Date", c3, metaY + 16);
  centerText(doc, payload.invoiceNo, c1, metaY + 36, { size: 11, bold: true });
  centerText(doc, `#${o.orderId}`, c2, metaY + 36, { size: 11, bold: true });
  centerText(doc, fmtDate(o.orderDate), c3, metaY + 36, { size: 11, bold: true });

  /* ---------------- sold by / bill to (bordered, centered) ---------------- */
  const sbY = metaY + metaH + GAP;
  const sbH = 112;
  const cxL = M + boxW / 2;
  const cxR = box2X + boxW / 2;

  labelC(doc, "Sold By", cxL, sbY + 14);
  centerText(doc, payload.storeName, cxL, sbY + 36, { size: 11, bold: true });

  labelC(doc, "Bill To", cxR, sbY + 14);
  let by = sbY + 34;
  by = centerBlock(doc, o.shippingName, cxR, boxW - 28, by, { size: 10, bold: true });
  by = centerBlock(doc, o.shippingAddress, cxR, boxW - 28, by, { size: 9 });
  by = centerBlock(doc, [o.shippingCity, o.shippingState].filter(Boolean).join(", "), cxR, boxW - 28, by, { size: 9 });
  by = centerBlock(doc, o.shippingPincode, cxR, boxW - 28, by, { size: 9 });
  centerBlock(doc, `Phone: ${o.shippingPhone}`, cxR, boxW - 28, by, { size: 9 });

  doc.rect(M, sbY, boxW, sbH).stroke();
  doc.rect(box2X, sbY, boxW, sbH).stroke();

  /* ---------------- items ---------------- */
  const tableEnd = drawItemsTable(doc, payload, sbY + sbH + GAP);

  /* ---------------- payment + bill summary ---------------- */
  const boxY = tableEnd + GAP;
  const payRows = [
    { label: "Method", value: payload.payment.method },
    { label: "Status", value: payload.payment.status },
    { label: "Amount Paid", value: rs(payload.payment.amountPaid) },
  ];
  if (payload.payment.collectCash) {
    payRows.push({ label: "Collect Cash", value: rs(o.totalAmount), bold: true });
  } else {
    payRows.push({ label: "Amount Due", value: rs(Math.max(0, o.totalAmount - payload.payment.amountPaid)), bold: true });
  }
  const boxH = drawTitleBox(doc, M, boxY, boxW, "Payment", payRows);

  const sumRows = [
    { label: "Items Total", value: rs(payload.summary.itemsTotal) },
    { label: "Discount", value: `- ${rs(payload.summary.discountAmount)}` },
    { label: "Shipping", value: rs(payload.summary.shippingAmount) },
    { label: "TOTAL AMOUNT", value: rs(payload.summary.grandTotal), bold: true },
  ];
  drawTitleBox(doc, box2X, boxY, boxW, "Bill Summary", sumRows);

  /* ---------------- footer: right after content ---------------- */
  const footerTop = Math.min(boxY + boxH + GAP, H - 120);
  const footerH = 84;
  doc.rect(0, footerTop, W, footerH).fill(BLACK);
  doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(18);
  const brandW = doc.widthOfString("BATRAVERSE");
  doc.text("BATRAVERSE", W / 2 - brandW / 2, footerTop + 22);
  doc.font("Helvetica-Bold").fontSize(10);
  const thanksText = "THANK YOU FOR YOUR ORDER.";
  const thanksW = doc.widthOfString(thanksText);
  doc.fillColor(WHITE).text(thanksText, W / 2 - thanksW / 2, footerTop + 49);
}

module.exports = { buildInvoicePdf };