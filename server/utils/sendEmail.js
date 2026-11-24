import nodemailer from "nodemailer";

const isEmailConfigured = () =>
  Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const createTransport = () =>
  nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

export const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  // Without email credentials (local development), print the link instead.
  if (!isEmailConfigured()) {
    console.log("\n[dev] Email is not configured. Password reset link for", to);
    console.log(resetUrl, "\n");
    return;
  }

  const safeName = String(name || "there").replace(/[<>&"']/g, "");

  await createTransport().sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: "Reset your SDP for GitHub password",
    text:
      `Hi ${safeName},\n\n` +
      `Use this link to choose a new password. It expires in 15 minutes:\n${resetUrl}\n\n` +
      `If you did not request this, you can ignore this email.`,
    html:
      `<p>Hi ${safeName},</p>` +
      `<p>Use the button below to choose a new password. The link expires in 15 minutes.</p>` +
      `<p><a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;` +
      `padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">Reset password</a></p>` +
      `<p>If the button does not work, copy this link into your browser:<br>${resetUrl}</p>` +
      `<p>If you did not request this, you can ignore this email.</p>`,
  });
};
