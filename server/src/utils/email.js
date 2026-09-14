const nodemailer = require("nodemailer");
const crypto = require("crypto");

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function htmlToText(html) {
  let t = String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h1|h2|h3|table)>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  t = t
    .replace(/&nbsp;/g, "\u00A0")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&eacute;/g, "e")
    .replace(/&hellip;/g, "\u2026")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  t = t.replace(/[ \t]{2,}/g, " ").replace(/\n[ ]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return t;
}

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

let cachedTransporter = null;

function makeTransporter() {
  if (cachedTransporter) return cachedTransporter;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    pool: true,
    maxConnections: 2,
    maxMessages: 100,
  });
  return cachedTransporter;
}

function resetTransporter() {
  if (cachedTransporter) {
    cachedTransporter.close();
    cachedTransporter = null;
  }
}

async function sendMail({ to, subject, html, text, replyTo, codeForConsole }) {
  const transporter = makeTransporter();
  if (!transporter || process.env.EMAIL_DISABLED === "true") {
    // Dev/test fallback — email disabled (log instead of SMTP).
    console.log(`[email] To: ${to} | Subject: ${subject}${codeForConsole ? ` | OTP: ${codeForConsole}` : ""}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: `"BATRAVERSE" <${process.env.EMAIL_USER}>`,
      to,
      replyTo: replyTo || process.env.EMAIL_USER,
      subject,
      priority: "normal",
      html,
      text: text || htmlToText(html),
      headers: { "X-Mailer": "BATRAVERSE", "X-Entity-Ref-ID": `BV-${Date.now()}` },
    });
  } catch (err) {
    console.error("[email] Send failed:", err.message);
    if (codeForConsole) console.log(`[email] OTP fallback for ${to}: ${codeForConsole}`);
    resetTransporter();
    throw err;
  }
}

const HEADER = `
  <div style="text-align:center;margin-bottom:32px;">
    <h1 style="color:#d4a853;font-size:22px;margin:0;letter-spacing:4px;">BATRA<span style="color:#fff;">VERSE</span></h1>
    <p style="color:#666;font-size:11px;margin:4px 0 0;text-transform:uppercase;letter-spacing:3px;">Luxury Marketplace</p>
  </div>`;

const FOOTER = `
  <p style="color:#666;font-size:12px;margin:24px 0 0;text-align:center;">BATRAVERSE — luxury, curated.</p>
  <p style="color:#555;font-size:11px;margin:16px 0 0;text-align:center;">You are receiving this email because it relates to your BATRAVERSE account or an order you placed.</p>`;

const PLAIN_FOOTER = `
BATRAVERSE — luxury, curated.
You are receiving this email because it relates to your BATRAVERSE account or an order you placed.`;

const CODE_BLOCK = (code) => `
  <p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:12px 0;">${escapeHtml(code)}</p>`;

const CARD_TEMPLATE = (body) => `
  <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:440px;border:1px solid #eaddc3;border-radius:12px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#000;">
    <tr>
      <td style="padding:20px 24px 2px;text-align:center;">
        <p style="font-size:20px;font-weight:bold;letter-spacing:4px;color:#b08a3e;margin:0;">BATRA<span style="color:#000;">VERSE</span></p>
      </td>
    </tr>
    <tr>
      <td style="padding:12px 24px 20px;text-align:center;">
        ${body}
      </td>
    </tr>
  </table>`;

const ACCENT_LINE = (word, color) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="border-left:2px solid ${color};border-right:2px solid ${color};padding:8px 0;text-align:center;">
        <span style="font-weight:bold;color:${color};font-size:15px;">${escapeHtml(word)}</span>
      </td>
    </tr>
  </table>`;

async function sendOTPEmail(to, code, name) {
  await sendMail({
    to,
    subject: "Your BATRAVERSE verification code",
    codeForConsole: code,
    html: `
      <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:440px;border:1px solid #eaddc3;border-radius:12px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#000;">
        <tr>
          <td style="padding:20px 24px 2px;text-align:center;">
            <p style="font-size:20px;font-weight:bold;letter-spacing:4px;color:#b08a3e;margin:0;">BATRA<span style="color:#000;">VERSE</span></p>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 24px 20px;text-align:center;">
            <p style="margin:0 0 6px;">Hello ${escapeHtml(name || "there")},</p>
            <p style="margin:0 0 2px;">Your verification code is:</p>
            ${CODE_BLOCK(code)}
            <p style="margin:8px 0 0;">This code expires in 5 minutes.</p>
            <p style="margin:0;">If you did not request this, you can ignore this email.</p>
          </td>
        </tr>
      </table>
    `,
  });
}

async function sendResetPasswordEmail(to, code, name) {
  await sendMail({
    to,
    subject: "Reset your BATRAVERSE password",
    codeForConsole: code,
    html: `
      <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:440px;border:1px solid #eaddc3;border-radius:12px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#000;">
        <tr>
          <td style="padding:20px 24px 2px;text-align:center;">
            <p style="font-size:20px;font-weight:bold;letter-spacing:4px;color:#b08a3e;margin:0;">BATRA<span style="color:#000;">VERSE</span></p>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 24px 20px;text-align:center;">
            <p style="margin:0 0 6px;">Hello ${escapeHtml(name || "there")},</p>
            <p style="margin:0 0 2px;">We received a request to reset your password.</p>
            <p style="margin:0 0 2px;">Use the following code to proceed:</p>
            ${CODE_BLOCK(code)}
            <p style="margin:8px 0 0;">This code expires in 5 minutes.</p>
            <p style="margin:0;">If you did not request a password reset, you can ignore this email and your password will stay the same.</p>
          </td>
        </tr>
      </table>
    `,
  });
}

async function sendCardPinResetEmail(to, code, name) {
  await sendMail({
    to,
    subject: "Reset your BATRAVERSE card PIN",
    codeForConsole: code,
    html: `
      <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:440px;border:1px solid #eaddc3;border-radius:12px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#000;">
        <tr>
          <td style="padding:20px 24px 2px;text-align:center;">
            <p style="font-size:20px;font-weight:bold;letter-spacing:4px;color:#b08a3e;margin:0;">BATRA<span style="color:#000;">VERSE</span></p>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 24px 20px;text-align:center;">
            <p style="margin:0 0 6px;">Hello ${escapeHtml(name || "there")},</p>
            <p style="margin:0 0 2px;">We received a request to reset the PIN for your card.</p>
            <p style="margin:0 0 2px;">Use the following code to set a new card PIN:</p>
            ${CODE_BLOCK(code)}
            <p style="margin:8px 0 0;">This code expires in 5 minutes.</p>
            <p style="margin:0;">If you did not request a card PIN reset, you can ignore this email and your PIN will stay the same.</p>
          </td>
        </tr>
      </table>
    `,
  });
}

async function sendPasswordChangedEmail(to, name, method, ipAddress) {
  await sendMail({
    to,
    subject: "Your Password Was Changed — BATRAVERSE",
    html: `
      <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:440px;border:1px solid #eaddc3;border-radius:12px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#000;">
        <tr>
          <td style="padding:20px 24px 2px;text-align:center;">
            <p style="font-size:20px;font-weight:bold;letter-spacing:4px;color:#b08a3e;margin:0;">BATRA<span style="color:#000;">VERSE</span></p>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 24px 20px;text-align:center;">
            <p style="margin:0 0 6px;">Hello ${escapeHtml(name || "there")},</p>
            <p style="margin:0 0 2px;">Your password has been successfully changed.</p>
            <p style="margin:14px 0 0;">Method: <span style="font-weight:bold;">${escapeHtml(method)}</span></p>
            ${ipAddress ? `<p style="margin:0;">IP Address: <span style="font-weight:bold;">${escapeHtml(ipAddress)}</span></p>` : ""}
            <p style="margin:0;">Time: <span style="font-weight:bold;">${escapeHtml(new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }))}</span></p>
            <p style="margin:18px 0 0;font-weight:bold;">Was this you?</p>
            <p style="margin:0 0 2px;">If you did not change your password, your account may be compromised. Contact us immediately at <span style="font-weight:bold;">batraverse.shopeverything@gmail.com</span>.</p>
            <p style="margin:8px 0 0;">If this was you, no further action is needed.</p>
          </td>
        </tr>
      </table>
    `,
  });
}

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  packed: "Packed",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  return_requested: "Return Requested",
  return_approved: "Return Approved",
  return_rejected: "Return Rejected",
  returned: "Returned",
  payment_approved: "Payment Approved",
};

const STATUS_WORDS = {
  pending: { pre: "is", word: "pending" },
  confirmed: { pre: "has been", word: "confirmed" },
  packed: { pre: "has been", word: "packed" },
  out_for_delivery: { pre: "is", word: "out for delivery" },
  delivered: { pre: "has been", word: "delivered" },
  cancelled: { pre: "has been", word: "cancelled" },
  return_requested: { pre: "has been", word: "submitted for return" },
  return_approved: { pre: "has been", word: "approved for return" },
  return_rejected: { pre: "has been", word: "rejected for return" },
  returned: { pre: "has been", word: "returned" },
};

const STATUS_COLORS = {
  delivered: "#16a34a",
  cancelled: "#dc2626",
  return_rejected: "#dc2626",
  returned: "#dc2626",
  return_approved: "#16a34a",
  return_requested: "#b08a3e",
  out_for_delivery: "#b08a3e",
};

const SOURCE_LABELS = {
  store: "Store",
  mart: "Grocery/Mart",
};

async function sendOrderStatusEmail(to, name, orderId, status, source, items) {
  const label = STATUS_LABELS[status] || status;
  const word = STATUS_WORDS[status]?.word || "updated";
  const pre = STATUS_WORDS[status]?.pre || "has been";
  const color = STATUS_COLORS[status] || "#b08a3e";
  const singleItem = Array.isArray(items) ? items.find((it) => it && it.name) : null;
  const productName = singleItem ? singleItem.name : "";
  await sendMail({
    to,
    subject: `Order ${label} — BATRAVERSE`,
    html: `
      <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:440px;border:1px solid #eaddc3;border-radius:12px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#000;">
        <tr>
          <td style="padding:20px 24px 2px;text-align:center;">
            <p style="font-size:20px;font-weight:bold;letter-spacing:4px;color:#b08a3e;margin:0;">BATRA<span style="color:#000;">VERSE</span></p>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 24px 20px;text-align:center;">
            <p style="margin:0 0 8px;">Hello ${escapeHtml(name || "there")},</p>
            <p style="margin:0 0 6px;font-size:15px;">
              Your order for
              ${productName ? ` ${escapeHtml(productName)}` : ""}
              (#${escapeHtml(String(orderId).toUpperCase())})
              ${pre}
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-left:2px solid ${color};border-right:2px solid ${color};padding:8px 0;text-align:center;">
                  <span style="font-weight:bold;color:${color};font-size:15px;">${escapeHtml(word)}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `,
  });
}

async function sendOrderConfirmationEmail(to, name, orderId, totalAmount, source, items) {
  const sourceLabel = SOURCE_LABELS[source] || "Store";
  const singleItem = Array.isArray(items) ? items.find((it) => it && it.name) : null;
  const productName = singleItem ? singleItem.name : "";
  const formattedAmount = Number(totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  await sendMail({
    to,
    subject: "Order Confirmed — BATRAVERSE",
    html: `
      <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:440px;border:1px solid #eaddc3;border-radius:12px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#000;">
        <tr>
          <td style="padding:20px 24px 2px;text-align:center;">
            <p style="font-size:20px;font-weight:bold;letter-spacing:4px;color:#b08a3e;margin:0;">BATRA<span style="color:#000;">VERSE</span></p>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 24px 20px;text-align:center;">
            <p style="margin:0 0 8px;">Hello ${escapeHtml(name || "there")},</p>
            <p style="margin:0;font-size:15px;">
              Your order for
              ${productName ? ` ${escapeHtml(productName)}` : ""}
              (#${escapeHtml(String(orderId).toUpperCase())})
              has been
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-left:2px solid #16a34a;border-right:2px solid #16a34a;padding:8px 0;text-align:center;">
                  <span style="font-weight:bold;color:#16a34a;font-size:15px;">confirmed</span>
                </td>
              </tr>
            </table>
            <p style="margin:14px 0 0;">Order Total: <span style="font-weight:bold;">₹${escapeHtml(formattedAmount)}</span></p>
            <p style="margin:16px 0 0;">We'll notify you as your order progresses.</p>
          </td>
        </tr>
      </table>
    `,
  });
}

async function sendDeliveryAssignedEmail(to, name, orderId, orderSource, details) {
  const sourceLabel = SOURCE_LABELS[orderSource] || "Store";
  const singleItem = Array.isArray(details && details.items) ? details.items.find((it) => it && it.name) : null;
  const productName = singleItem ? singleItem.name : "";
  const deliverTo = details && details.shippingName ? `${details.shippingName}${details.shippingPhone ? ` · ${details.shippingPhone}` : ""}` : "";
  const addressLine = [details && details.shippingAddress, details && details.shippingCity, details && details.shippingState, details && details.shippingPincode].filter((x) => x).join(", ");
  await sendMail({
    to,
    subject: "New Delivery Assigned — BATRAVERSE",
    html: `
      <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:440px;border:1px solid #eaddc3;border-radius:12px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#000;">
        <tr>
          <td style="padding:20px 24px 2px;text-align:center;">
            <p style="font-size:20px;font-weight:bold;letter-spacing:4px;color:#b08a3e;margin:0;">BATRA<span style="color:#000;">VERSE</span></p>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 24px 20px;text-align:center;">
            <p style="margin:0 0 8px;">Hello ${escapeHtml(name || "there")},</p>
            <p style="margin:0 0 6px;font-size:15px;">You have been assigned a new delivery.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-left:2px solid #b08a3e;border-right:2px solid #b08a3e;padding:8px 0;text-align:center;">
                  <span style="font-weight:bold;color:#b08a3e;font-size:15px;">Delivery Assigned</span>
                </td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
              <tr>
                <td style="text-align:left;padding:4px 0;color:#000;"><span style="font-weight:bold;">Product:</span> ${productName ? escapeHtml(productName) : "—"}</td>
              </tr>
              <tr>
                <td style="text-align:left;padding:4px 0;color:#000;"><span style="font-weight:bold;">Order ID:</span> #${escapeHtml(String(orderId).toUpperCase())}</td>
              </tr>
              <tr>
                <td style="text-align:left;padding:4px 0;color:#000;"><span style="font-weight:bold;">Type:</span> ${escapeHtml(sourceLabel)}</td>
              </tr>
              <tr>
                <td style="text-align:left;padding:4px 0;color:#000;"><span style="font-weight:bold;">Deliver to:</span> ${deliverTo ? escapeHtml(deliverTo) : "—"}</td>
              </tr>
              ${addressLine ? `<tr><td style="text-align:left;padding:4px 0;color:#000;"><span style="font-weight:bold;">Address:</span> ${escapeHtml(addressLine)}</td></tr>` : ""}
            </table>
            <p style="margin:16px 0 0;">Please review the order details in your delivery dashboard.</p>
          </td>
        </tr>
      </table>
    `,
  });
}

async function sendDeliveryWarningEmail(to, name, orderId, reason) {
  await sendMail({
    to,
    subject: "Delivery Warning — BATRAVERSE",
    html: `
      <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:440px;border:1px solid #eaddc3;border-radius:12px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#000;">
        <tr>
          <td style="padding:20px 24px 2px;text-align:center;">
            <p style="font-size:20px;font-weight:bold;letter-spacing:4px;color:#b08a3e;margin:0;">BATRA<span style="color:#000;">VERSE</span></p>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 24px 20px;text-align:center;">
            <p style="margin:0 0 8px;">Hello ${escapeHtml(name || "there")},</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-left:2px solid #dc2626;border-right:2px solid #dc2626;padding:8px 0;text-align:center;">
                  <span style="font-weight:bold;color:#dc2626;font-size:15px;">Warning</span>
                </td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
              <tr>
                <td style="text-align:left;padding:4px 0;color:#000;"><span style="font-weight:bold;">Order ID:</span> #${escapeHtml(String(orderId).toUpperCase())}</td>
              </tr>
              <tr>
                <td style="text-align:left;padding:4px 0;color:#000;"><span style="font-weight:bold;">Reason:</span> ${escapeHtml(reason || "Late cancellation/unassignment")}</td>
              </tr>
            </table>
            <p style="color:#dc2626;margin:16px 0 0;">This incident has been recorded. Repeated violations may result in account suspension.</p>
          </td>
        </tr>
      </table>
    `,
  });
}

async function sendDeliveryVerificationEmail(to, name, orderId, code) {
  await sendMail({
    to,
    subject: "Verify Your Delivery — BATRAVERSE",
    codeForConsole: code,
    html: `
      <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:440px;border:1px solid #eaddc3;border-radius:12px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#000;">
        <tr>
          <td style="padding:20px 24px 2px;text-align:center;">
            <p style="font-size:20px;font-weight:bold;letter-spacing:4px;color:#b08a3e;margin:0;">BATRA<span style="color:#000;">VERSE</span></p>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 24px 20px;text-align:center;">
            <p style="margin:0 0 8px;">Hello ${escapeHtml(name || "there")},</p>
            <p style="margin:0 0 10px;">Your delivery executive has marked order #${escapeHtml(String(orderId).toUpperCase())} as delivered. Please verify by entering the OTP below:</p>
            ${CODE_BLOCK(code)}
            <p style="margin:16px 0 0;">This OTP expires in 15 minutes. Enter it in the orders section to confirm delivery.</p>
          </td>
        </tr>
      </table>
    `,
  });
}

async function sendReturnApprovedEmail(to, name, orderId, approved) {
  const accent = approved ? "#16a34a" : "#dc2626";
  const word = approved ? "approved" : "rejected";
  await sendMail({
    to,
    subject: `Return ${approved ? "Approved" : "Rejected"} — BATRAVERSE`,
    html: `
      <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:440px;border:1px solid #eaddc3;border-radius:12px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#000;">
        <tr>
          <td style="padding:20px 24px 2px;text-align:center;">
            <p style="font-size:20px;font-weight:bold;letter-spacing:4px;color:#b08a3e;margin:0;">BATRA<span style="color:#000;">VERSE</span></p>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 24px 20px;text-align:center;">
            <p style="margin:0 0 8px;">Hello ${escapeHtml(name || "there")},</p>
            <p style="margin:0 0 6px;font-size:15px;">Your return request has been</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-left:2px solid ${accent};border-right:2px solid ${accent};padding:8px 0;text-align:center;">
                  <span style="font-weight:bold;color:${accent};font-size:15px;">${escapeHtml(word)}</span>
                </td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
              <tr>
                <td style="text-align:left;padding:4px 0;color:#000;"><span style="font-weight:bold;">Order ID:</span> #${escapeHtml(String(orderId).toUpperCase())}</td>
              </tr>
            </table>
            ${approved ? `<p style="margin:16px 0 0;">A delivery executive will be assigned to pick up the return.</p>` : `<p style="color:#dc2626;margin:16px 0 0;">If you believe this is a mistake, please contact our support team.</p>`}
          </td>
        </tr>
      </table>
    `,
  });
}

module.exports = {
  generateOTP,
  sendMail,
  escapeHtml,
  htmlToText,
  resetTransporter,
  CARD_TEMPLATE,
  ACCENT_LINE,
  sendOTPEmail,
  sendResetPasswordEmail,
  sendCardPinResetEmail,
  sendPasswordChangedEmail,
  sendOrderStatusEmail,
  sendOrderConfirmationEmail,
  sendDeliveryAssignedEmail,
  sendDeliveryWarningEmail,
  sendDeliveryVerificationEmail,
  sendReturnApprovedEmail,
};
