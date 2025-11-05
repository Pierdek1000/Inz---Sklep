import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST as string;
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpUser = process.env.SMTP_USER as string;
const smtpPass = process.env.SMTP_PASS as string;
const mailFrom = (process.env.MAIL_FROM as string) || smtpUser;

export const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465, // true for 465, false for others
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

export async function sendMail(options: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}) {
  await transporter.sendMail({
    from: mailFrom,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}
