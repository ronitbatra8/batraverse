const express = require("express");
const prisma = require("../db");
const { adminAuth } = require("../middleware/auth");
const { userAuth } = require("../middleware/userAuth");
const { safeErrorMessage, MESSAGE_STATUSES } = require("../utils/helpers");
const { sendMail, escapeHtml } = require("../utils/email");

const router = express.Router();

const STATUS_LABELS = {
  pending: "Pending Review",
  "in-progress": "In Progress",
  replied: "Replied",
  resolved: "Resolved",
};

async function notifyEmails(msg, subject, html) {
  var emails = [];
  if (msg.email) emails.push(msg.email);
  if (msg.altEmail) emails.push(msg.altEmail);
  for (var i = 0; i < emails.length; i++) {
    try {
      await sendMail({ to: emails[i], subject: subject, html: html });
    } catch (err) {
      console.error("[email] Message notification failed for " + emails[i] + ":", err.message);
    }
  }
}

router.post("/", async (req, res) => {
  try {
    var _a = req.body;
    var name = _a.name;
    var email = _a.email;
    var altEmail = _a.altEmail;
    var subject = _a.subject;
    var message = _a.message;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "Name, email, subject, and message are required" });
    }
    if (message.trim().length < 5) {
      return res.status(400).json({ error: "Message must be at least 5 characters" });
    }
    var userId = null;
    var authHeader = req.headers.authorization || "";
    if (authHeader.startsWith("Bearer ")) {
      try {
        var jwt = require("jsonwebtoken");
        var payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
        if (payload.userId) {
          var user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true } });
          if (user) userId = user.id;
        }
      } catch (e) {}
    }
    var msg = await prisma.message.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        altEmail: altEmail ? altEmail.trim() : null,
        subject: subject.trim(),
        message: message.trim(),
        userId: userId,
      },
    });
    res.json({ ok: true, id: msg.id });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/my", userAuth, async (req, res) => {
  try {
    var user = await prisma.user.findUnique({ where: { id: req.userId }, select: { id: true, email: true, name: true } });
    if (!user) return res.json({ messages: [] });
    var messages = await prisma.message.findMany({
      where: { OR: [{ userId: req.userId }, { email: user.email }] },
      orderBy: { createdAt: "desc" },
    });
    res.json({ messages: messages });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.get("/list", adminAuth, async (req, res) => {
  try {
    var messages = await prisma.message.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    var unread = messages.filter(function (m) { return !m.read; }).length;
    res.json({ total: messages.length, unread: unread, messages: messages });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/:id/status", adminAuth, async (req, res) => {
  try {
    var status = req.body.status;
    if (!status || !MESSAGE_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be one of: " + MESSAGE_STATUSES.join(", ") });
    }
    var existing = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Message not found" });
    await prisma.message.update({ where: { id: req.params.id }, data: { status: status, read: true } });
    var statusLabel = STATUS_LABELS[status] || status;
    var statusHtml = '<div style="max-width:480px;margin:0 auto;font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;padding:40px;border-radius:16px;">'
      + '<div style="text-align:center;margin-bottom:32px;">'
      + '<h1 style="color:#d4a853;font-size:22px;margin:0;letter-spacing:4px;">BATRA<span style="color:#fff;">VERSE</span></h1>'
      + '<p style="color:#666;font-size:11px;margin:4px 0 0;text-transform:uppercase;letter-spacing:3px;">Luxury Marketplace</p>'
      + '</div>'
      + '<p style="color:#999;font-size:14px;margin:0 0 8px;">Hello ' + escapeHtml(existing.name || "there") + ',</p>'
      + '<p style="color:#999;font-size:14px;margin:0 0 16px;">The status of your message has been updated.</p>'
      + '<div style="background:#111;border:1px solid #222;border-radius:12px;padding:16px;margin-bottom:20px;">'
      + '<p style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px;">Message</p>'
      + '<p style="color:#d4a853;font-size:14px;font-weight:bold;margin:0 0 6px;">' + escapeHtml(existing.subject || "Your Query") + '</p>'
      + '</div>'
      + '<div style="background:#111;border:1px solid #222;border-radius:12px;padding:16px;margin-bottom:20px;">'
      + '<p style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px;">New Status</p>'
      + '<p style="color:#d4a853;font-size:16px;font-weight:bold;margin:0;">' + escapeHtml(statusLabel) + '</p>'
      + '</div>'
      + '<p style="color:#666;font-size:12px;margin:0;">If you have further questions, reply to this email or visit our contact page.</p>'
      + '<p style="color:#666;font-size:12px;margin:24px 0 0;text-align:center;">BATRAVERSE \u2014 luxury, curated.</p>'
      + '</div>';
    notifyEmails(existing, "Message Status Updated \u2014 BATRAVERSE", statusHtml);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
});

router.put("/:id/read", adminAuth, async (req, res) => {
  try {
    var existing = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Message not found" });
    await prisma.message.update({ where: { id: req.params.id }, data: { read: true } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update message" });
  }
});

router.post("/:id/reply", adminAuth, async (req, res) => {
  try {
    var replyMessage = req.body.replyMessage;
    if (!replyMessage || replyMessage.trim().length < 3) {
      return res.status(400).json({ error: "Reply message must be at least 3 characters" });
    }
    var msg = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!msg) return res.status(404).json({ error: "Message not found" });

    await prisma.message.update({
      where: { id: req.params.id },
      data: { replyMessage: replyMessage.trim(), repliedAt: new Date(), status: "replied", read: true },
    });

    var replyHtml = '<div style="max-width:480px;margin:0 auto;font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;padding:40px;border-radius:16px;">'
      + '<div style="text-align:center;margin-bottom:32px;">'
      + '<h1 style="color:#d4a853;font-size:22px;margin:0;letter-spacing:4px;">BATRA<span style="color:#fff;">VERSE</span></h1>'
      + '<p style="color:#666;font-size:11px;margin:4px 0 0;text-transform:uppercase;letter-spacing:3px;">Luxury Marketplace</p>'
      + '</div>'
      + '<p style="color:#999;font-size:14px;margin:0 0 8px;">Hello ' + escapeHtml(msg.name || "there") + ',</p>'
      + '<p style="color:#999;font-size:14px;margin:0 0 16px;">We\'ve replied to your message:</p>'
      + '<div style="background:#111;border:1px solid #222;border-radius:12px;padding:16px;margin-bottom:20px;">'
      + '<p style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px;">Your Message</p>'
      + '<p style="color:#999;font-size:13px;margin:0 0 12px;">' + escapeHtml(msg.message) + '</p>'
      + '</div>'
      + '<div style="background:#111;border:1px solid #222;border-radius:12px;padding:16px;margin-bottom:20px;">'
      + '<p style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px;">Our Reply</p>'
      + '<p style="color:#fff;font-size:14px;margin:0;white-space:pre-wrap;">' + escapeHtml(replyMessage.trim()) + '</p>'
      + '</div>'
      + '<p style="color:#666;font-size:12px;margin:0;">If you have further questions, reply to this email or visit our contact page.</p>'
      + '<p style="color:#666;font-size:12px;margin:24px 0 0;text-align:center;">BATRAVERSE \u2014 luxury, curated.</p>'
      + '</div>';

    notifyEmails(msg, "Re: " + (msg.subject || "Your Query") + " \u2014 BATRAVERSE", replyHtml);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to send reply" });
  }
});

router.delete("/:id", adminAuth, async (req, res) => {
  try {
    var existing = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Message not found" });
    await prisma.message.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete message" });
  }
});

module.exports = router;
