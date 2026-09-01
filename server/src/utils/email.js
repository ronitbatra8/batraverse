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

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

function makeTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function sendMail({ to, subject, html, codeForConsole }) {
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
      subject,
      html,
    });
  } catch (err) {
    console.error("[email] Send failed:", err.message);
    if (codeForConsole) console.log(`[email] OTP fallback for ${to}: ${codeForConsole}`);
    throw err;
  }
}

const HEADER = `
  <div style="text-align:center;margin-bottom:32px;">
    <h1 style="color:#d4a853;font-size:22px;margin:0;letter-spacing:4px;">BATRA<span style="color:#fff;">VERSE</span></h1>
    <p style="color:#666;font-size:11px;margin:4px 0 0;text-transform:uppercase;letter-spacing:3px;">Luxury Marketplace</p>
  </div>`;

const FOOTER = `
  <p style="color:#666;font-size:12px;margin:24px 0 0;text-align:center;">BATRAVERSE — luxury, curated.</p>`;

const CODE_BLOCK = (code) => `
  <p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:12px 0;">${escapeHtml(code)}</p>`;

async function sendOTPEmail(to, code, name) {
  await sendMail({
    to,
    subject: "Your BATRAVERSE verification code",
    codeForConsole: code,
    html: `
      <div style="margin:0 auto;max-width:480px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#111;">
        <p style="font-size:18px;font-weight:bold;margin:0 0 16px;">BATRAVERSE</p>
        <p style="margin:0 0 8px;">Hello ${escapeHtml(name || "there")},</p>
        <p style="margin:0 0 8px;">Your verification code is:</p>
        ${CODE_BLOCK(code)}
        <p style="color:#555;font-size:12px;margin:12px 0 0;">This code expires in 5 minutes. If you did not request this, you can ignore this email.</p>
        <p style="color:#555;font-size:12px;margin:16px 0 0;">BATRAVERSE — luxury, curated.</p>
      </div>
    `,
  });
}

async function sendResetPasswordEmail(to, code, name) {
  await sendMail({
    to,
    subject: "Reset your BATRAVERSE password",
    codeForConsole: code,
    html: `
      <div style="margin:0 auto;max-width:480px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#111;">
        <p style="font-size:18px;font-weight:bold;margin:0 0 16px;">BATRAVERSE</p>
        <p style="margin:0 0 8px;">Hello ${escapeHtml(name || "there")},</p>
        <p style="margin:0 0 8px;">We received a request to reset your password. Use the following code to proceed:</p>
        ${CODE_BLOCK(code)}
        <p style="color:#555;font-size:12px;margin:12px 0 0;">This code expires in 5 minutes. If you did not request a password reset, you can ignore this email and your password will stay the same.</p>
        <p style="color:#555;font-size:12px;margin:16px 0 0;">BATRAVERSE — luxury, curated.</p>
      </div>
    `,
  });
}

async function sendPasswordChangedEmail(to, name, method, ipAddress) {
  await sendMail({
    to,
    subject: "Your Password Was Changed — BATRAVERSE",
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;padding:40px;border-radius:16px;">
        ${HEADER}
        <p style="color:#999;font-size:14px;margin:0 0 8px;">Hello ${escapeHtml(name || "there")},</p>
        <p style="color:#fff;font-size:14px;margin:0 0 20px;">Your password has been successfully changed.</p>
        <div style="background:#111;border:1px solid #222;border-radius:12px;padding:16px;margin-bottom:20px;">
          <p style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px;">Change Details</p>
          <div style="margin-bottom:8px;">
            <span style="color:#666;font-size:12px;">Method: </span>
            <span style="color:#d4a853;font-size:12px;font-weight:bold;">${escapeHtml(method)}</span>
          </div>
          ${ipAddress ? `<div style="margin-bottom:8px;">
            <span style="color:#666;font-size:12px;">IP Address: </span>
            <span style="color:#fff;font-size:12px;">${escapeHtml(ipAddress)}</span>
          </div>` : ""}
          <div>
            <span style="color:#666;font-size:12px;">Time: </span>
            <span style="color:#fff;font-size:12px;">${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
          </div>
        </div>
        <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:16px;margin-bottom:20px;">
          <p style="color:#ef4444;font-size:13px;font-weight:bold;margin:0 0 6px;">Was this you?</p>
          <p style="color:#999;font-size:12px;margin:0;line-height:1.6;">If you did NOT change your password, your account may be compromised. Contact us immediately.</p>
        </div>
        <p style="color:#666;font-size:12px;margin:0;">If this was you, no further action is needed.</p>
        ${FOOTER}
      </div>
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
  returned: "Returned",
  payment_approved: "Payment Approved",
};

const SOURCE_LABELS = {
  store: "Store",
  mart: "Grocery/Mart",
  mediverse: "Mediverse",
};

async function sendOrderStatusEmail(to, name, orderId, status) {
  const label = STATUS_LABELS[status] || status;
  const isCancel = status === "cancelled";
  const isDelivered = status === "delivered";
  const accent = isCancel ? "#ef4444" : isDelivered ? "#22c55e" : "#d4a853";
  await sendMail({
    to,
    subject: `Order ${label} — BATRAVERSE`,
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;padding:40px;border-radius:16px;">
        ${HEADER}
        <p style="color:#999;font-size:14px;margin:0 0 8px;">Hello ${escapeHtml(name || "there")},</p>
        <p style="color:#fff;font-size:14px;margin:0 0 20px;">Your order status has been updated.</p>
        <div style="background:#111;border:1px solid #222;border-radius:12px;padding:16px;margin-bottom:20px;">
          <div style="margin-bottom:8px;">
            <span style="color:#666;font-size:12px;">Order ID: </span>
            <span style="color:#d4a853;font-size:12px;font-weight:bold;">#${escapeHtml(String(orderId).toUpperCase())}</span>
          </div>
          <div>
            <span style="color:#666;font-size:12px;">Status: </span>
            <span style="color:${accent};font-size:14px;font-weight:bold;">${escapeHtml(label)}</span>
          </div>
        </div>
        ${isCancel ? `<p style="color:#999;font-size:13px;margin:0 0 12px;">If you did not request this cancellation, please contact support immediately.</p>` : ""}
        ${isDelivered ? `<p style="color:#999;font-size:13px;margin:0 0 12px;">Please verify your delivery in the orders section to confirm receipt.</p>` : ""}
        ${FOOTER}
      </div>
    `,
  });
}

async function sendOrderConfirmationEmail(to, name, orderId, totalAmount, source) {
  const sourceLabel = SOURCE_LABELS[source] || "Store";
  await sendMail({
    to,
    subject: "Order Confirmed — BATRAVERSE",
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;padding:40px;border-radius:16px;">
        ${HEADER}
        <p style="color:#999;font-size:14px;margin:0 0 8px;">Hello ${escapeHtml(name || "there")},</p>
        <p style="color:#fff;font-size:14px;margin:0 0 20px;">Your ${escapeHtml(sourceLabel)} order has been placed successfully.</p>
        <div style="background:#111;border:1px solid #222;border-radius:12px;padding:16px;margin-bottom:20px;">
          <div style="margin-bottom:8px;">
            <span style="color:#666;font-size:12px;">Order ID: </span>
            <span style="color:#d4a853;font-size:12px;font-weight:bold;">#${escapeHtml(String(orderId).toUpperCase())}</span>
          </div>
          <div style="margin-bottom:8px;">
            <span style="color:#666;font-size:12px;">Type: </span>
            <span style="color:#fff;font-size:12px;">${escapeHtml(sourceLabel)}</span>
          </div>
          <div>
            <span style="color:#666;font-size:12px;">Total: </span>
            <span style="color:#d4a853;font-size:14px;font-weight:bold;">₹${escapeHtml(String(totalAmount.toFixed(2)))}</span>
          </div>
        </div>
        <p style="color:#999;font-size:13px;margin:0 0 12px;">We'll notify you as your order progresses.</p>
        ${FOOTER}
      </div>
    `,
  });
}

async function sendDeliveryAssignedEmail(to, name, orderId, orderSource) {
  const sourceLabel = SOURCE_LABELS[orderSource] || "Store";
  await sendMail({
    to,
    subject: "New Delivery Assignment — BATRAVERSE",
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;padding:40px;border-radius:16px;">
        ${HEADER}
        <p style="color:#999;font-size:14px;margin:0 0 8px;">Hello ${escapeHtml(name || "there")},</p>
        <p style="color:#fff;font-size:14px;margin:0 0 20px;">You have been assigned a new delivery.</p>
        <div style="background:#111;border:1px solid #222;border-radius:12px;padding:16px;margin-bottom:20px;">
          <div style="margin-bottom:8px;">
            <span style="color:#666;font-size:12px;">Order ID: </span>
            <span style="color:#d4a853;font-size:12px;font-weight:bold;">#${escapeHtml(String(orderId).toUpperCase())}</span>
          </div>
          <div>
            <span style="color:#666;font-size:12px;">Type: </span>
            <span style="color:#fff;font-size:12px;">${escapeHtml(sourceLabel)}</span>
          </div>
        </div>
        <p style="color:#999;font-size:13px;margin:0 0 12px;">Please review the order details in your delivery dashboard.</p>
        ${FOOTER}
      </div>
    `,
  });
}

async function sendDeliveryWarningEmail(to, name, orderId, reason) {
  await sendMail({
    to,
    subject: "Delivery Warning — BATRAVERSE",
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;padding:40px;border-radius:16px;">
        ${HEADER}
        <p style="color:#999;font-size:14px;margin:0 0 8px;">Hello ${escapeHtml(name || "there")},</p>
        <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:16px;margin-bottom:20px;">
          <p style="color:#ef4444;font-size:14px;font-weight:bold;margin:0 0 8px;">Warning</p>
          <p style="color:#999;font-size:13px;margin:0;">You have cancelled/unassigned an order outside the allowed time window.</p>
        </div>
        <div style="background:#111;border:1px solid #222;border-radius:12px;padding:16px;margin-bottom:20px;">
          <div style="margin-bottom:8px;">
            <span style="color:#666;font-size:12px;">Order ID: </span>
            <span style="color:#d4a853;font-size:12px;font-weight:bold;">#${escapeHtml(String(orderId).toUpperCase())}</span>
          </div>
          <div>
            <span style="color:#666;font-size:12px;">Reason: </span>
            <span style="color:#fff;font-size:12px;">${escapeHtml(reason || "Late cancellation/unassignment")}</span>
          </div>
        </div>
        <p style="color:#ef4444;font-size:12px;margin:0;">This incident has been recorded. Repeated violations may result in account suspension.</p>
        ${FOOTER}
      </div>
    `,
  });
}

async function sendDeliveryVerificationEmail(to, name, orderId, code) {
  await sendMail({
    to,
    subject: "Verify Your Delivery — BATRAVERSE",
    codeForConsole: code,
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;padding:40px;border-radius:16px;">
        ${HEADER}
        <p style="color:#999;font-size:14px;margin:0 0 8px;">Hello ${escapeHtml(name || "there")},</p>
        <p style="color:#fff;font-size:14px;margin:0 0 20px;">Your delivery executive has marked your order as delivered. Please verify by entering the OTP below:</p>
        ${CODE_BLOCK(code)}
        <p style="color:#666;font-size:12px;margin:24px 0 0;">This OTP expires in 15 minutes. Enter it in the orders section to confirm delivery.</p>
        ${FOOTER}
      </div>
    `,
  });
}

async function sendReturnApprovedEmail(to, name, orderId, approved) {
  const accent = approved ? "#22c55e" : "#ef4444";
  const text = approved ? "Your return request has been approved." : "Your return request has been rejected.";
  await sendMail({
    to,
    subject: `Return ${approved ? "Approved" : "Rejected"} — BATRAVERSE`,
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;padding:40px;border-radius:16px;">
        ${HEADER}
        <p style="color:#999;font-size:14px;margin:0 0 8px;">Hello ${escapeHtml(name || "there")},</p>
        <p style="color:${accent};font-size:14px;font-weight:bold;margin:0 0 20px;">${escapeHtml(text)}</p>
        <div style="background:#111;border:1px solid #222;border-radius:12px;padding:16px;margin-bottom:20px;">
          <div>
            <span style="color:#666;font-size:12px;">Order ID: </span>
            <span style="color:#d4a853;font-size:12px;font-weight:bold;">#${escapeHtml(String(orderId).toUpperCase())}</span>
          </div>
        </div>
        ${approved ? `<p style="color:#999;font-size:13px;margin:0 0 12px;">A delivery executive will be assigned to pick up the return.</p>` : ""}
        ${FOOTER}
      </div>
    `,
  });
}

module.exports = {
  generateOTP,
  sendMail,
  escapeHtml,
  sendOTPEmail,
  sendResetPasswordEmail,
  sendPasswordChangedEmail,
  sendOrderStatusEmail,
  sendOrderConfirmationEmail,
  sendDeliveryAssignedEmail,
  sendDeliveryWarningEmail,
  sendDeliveryVerificationEmail,
  sendReturnApprovedEmail,
};
