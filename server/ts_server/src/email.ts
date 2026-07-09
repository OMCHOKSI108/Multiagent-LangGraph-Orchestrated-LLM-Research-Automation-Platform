import { Resend } from "resend";
import logger from "./logger.js";

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const apiKey = process.env.RESEND_API_KEY;

let resend: Resend | null = null;
if (apiKey) {
  resend = new Resend(apiKey);
} else {
  logger.warn("RESEND_API_KEY not set — email sending is disabled");
}

function wrapHtml(body: string): string {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #f4f1ed; }
    .container { max-width: 560px; margin: 0 auto; padding: 32px 24px; }
    .card { background: #ffffff; border-radius: 16px; padding: 40px 36px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
    .logo { font-family: Georgia, 'Times New Roman', serif; font-size: 20px; color: #1a1a1a; letter-spacing: -0.3px; margin-bottom: 24px; }
    .divider { height: 1px; background: #e5e5e5; margin: 20px 0; }
    .footer { font-family: Georgia, 'Times New Roman', serif; font-size: 13px; color: #888; text-align: center; margin-top: 28px; line-height: 1.5; }
    .footer a { color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">Multiagent Research Automation Platform</div>
      ${body}
    </div>
    <div class="footer">
      Multiagent Research Automation Platform &middot; AI-powered research assistant<br>
      <a href="${appUrl}">${appUrl}</a>
    </div>
  </div>
</body>
</html>`;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  if (!resend) {
    logger.warn(`Email not sent (no API key): to=${to} subject="${subject}"`);
    return;
  }

  const from = process.env.EMAIL_FROM || "Multiagent Research Automation Platform <noreply@omchoksi.codes>";

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html: wrapHtml(html),
  });

  if (error) {
    logger.error("Resend error:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  logger.info(`Email sent to ${to} — subject: "${subject}"`);
}

export function buildVerificationEmail(name: string, verifyToken: string): string {
  return `
    <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 6px 0;">Hello${name ? ", " + name : ""},</p>
    <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 18px 0;">Thank you for creating an account with <strong>Multiagent Research Automation Platform</strong>. Please verify your email address by clicking the button below.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
      <tr>
        <td align="center" style="background-color: #1a1a1a; border-radius: 40px;">
          <a href="${APP_URL}/verify-email?token=${verifyToken}" style="display: inline-block; padding: 14px 36px; font-family: Georgia, 'Times New Roman', serif; font-size: 15px; color: #ffffff; text-decoration: none; letter-spacing: 0.3px;">Verify Email Address</a>
        </td>
      </tr>
    </table>
    <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 14px; color: #666; line-height: 1.5; margin: 0 0 6px 0;">Or copy and paste this link into your browser:</p>
    <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 13px; color: #888; line-height: 1.4; margin: 0 0 0 0; word-break: break-all;">${APP_URL}/verify-email?token=${verifyToken}</p>
    <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 13px; color: #888; line-height: 1.4; margin: 18px 0 0 0;">This link expires in 48 hours. If you did not create this account, you can safely ignore this email.</p>`;
}

export function buildMagicLinkEmail(name: string, token: string): string {
  return `
    <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 6px 0;">Hello${name ? ", " + name : ""},</p>
    <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 18px 0;">Click the button below to sign in to your <strong>Multiagent Research Automation Platform</strong> account.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
      <tr>
        <td align="center" style="background-color: #1a1a1a; border-radius: 40px;">
          <a href="${APP_URL}/auth/callback?token=${token}" style="display: inline-block; padding: 14px 36px; font-family: Georgia, 'Times New Roman', serif; font-size: 15px; color: #ffffff; text-decoration: none; letter-spacing: 0.3px;">Sign In</a>
        </td>
      </tr>
    </table>
    <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 14px; color: #666; line-height: 1.5; margin: 0 0 6px 0;">Or copy and paste this link:</p>
    <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 13px; color: #888; line-height: 1.4; margin: 0 0 0 0; word-break: break-all;">${APP_URL}/auth/callback?token=${token}</p>
    <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 13px; color: #888; line-height: 1.4; margin: 18px 0 0 0;">This link expires in 1 hour. If you did not request this link, you can safely ignore this email.</p>`;
}

export function buildPasswordResetEmail(name: string, token: string): string {
  return `
    <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 6px 0;">Hello${name ? ", " + name : ""},</p>
    <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 18px 0;">We received a request to reset the password for your <strong>Multiagent Research Automation Platform</strong> account. Click the button below to set a new password.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
      <tr>
        <td align="center" style="background-color: #1a1a1a; border-radius: 40px;">
          <a href="${APP_URL}/reset-password?token=${token}" style="display: inline-block; padding: 14px 36px; font-family: Georgia, 'Times New Roman', serif; font-size: 15px; color: #ffffff; text-decoration: none; letter-spacing: 0.3px;">Reset Password</a>
        </td>
      </tr>
    </table>
    <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 14px; color: #666; line-height: 1.5; margin: 0 0 6px 0;">Or copy and paste this link:</p>
    <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 13px; color: #888; line-height: 1.4; margin: 0 0 0 0; word-break: break-all;">${APP_URL}/reset-password?token=${token}</p>
    <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 13px; color: #888; line-height: 1.4; margin: 18px 0 0 0;">This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>`;
}

export function buildWelcomeEmail(name: string): string {
  return `
    <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 6px 0;">Hello${name ? ", " + name : ""},</p>
    <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 18px 0;">Welcome to <strong>Multiagent Research Automation Platform</strong>! Your email has been verified and your account is ready to use.</p>
    <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 18px 0;">Start a new research session to let our multi-agent AI system gather, analyze, and synthesize information from across the web into comprehensive reports and IEEE-format papers.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
      <tr>
        <td align="center" style="background-color: #1a1a1a; border-radius: 40px;">
          <a href="${APP_URL}" style="display: inline-block; padding: 14px 36px; font-family: Georgia, 'Times New Roman', serif; font-size: 15px; color: #ffffff; text-decoration: none; letter-spacing: 0.3px;">Start Researching</a>
        </td>
      </tr>
    </table>`;
}

export function buildPasswordChangedEmail(name: string): string {
  return `
    <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 6px 0;">Hello${name ? ", " + name : ""},</p>
    <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 18px 0;">Your <strong>Multiagent Research Automation Platform</strong> password has been changed successfully.</p>
    <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 18px 0;">If you did not make this change, please contact support immediately.</p>`;
}
