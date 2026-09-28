const nodemailer = require("nodemailer");

/*
 * Reused for every outgoing email (currently just the password reset code).
 * options: { email, subject, message }
 */
const sendEmail = async (options) => {
  /*
   * nodemailer object that connects to an SMTP server to send mail.
   * Works with any SMTP-compatible service (Gmail, Outlook, SendGrid, Mailtrap, custom servers),
   * or alternative transports like SES via different config options.
   * The host/port/auth options below are equivalent to the connection URL:
   * "smtp://user:pass@smtp.example.com:587"
   */
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    /*
     * true for 465 (TLS), false for other ports (STARTTLS).
     * nodemailer negotiates the STARTTLS upgrade itself, nothing manual needed here.
     * STARTTLS is used on non-465 ports because those start as a plain connection
     * and upgrade to TLS mid-handshake, while 465 uses implicit TLS from the start.
     */
    secure: Number(process.env.EMAIL_PORT) === 465,
    /*
     * For Gmail: EMAIL_PASSWORD must be an App Password, not the account's real
     * password. Using the real password fails with:
     *   code: 'EAUTH', responseCode: 535,
     *   response: '535-5.7.8 Username and Password not accepted ...'
     * "Less secure app access" (sign in with just username/password) was removed
     * by Google starting January 2025, so App Passwords (or OAuth2) are now required.
     * To get one: enable 2-Step Verification on the Google account, then generate
     * an App Password at Google Account > Security > App passwords, and use that
     * 16-character value here (no spaces). EMAIL_USER must be the full Gmail address
     * the app password was generated for.
     */
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  /*
   * `text` sends plain text; sendMail also accepts an `html` option
   * for HTML-formatted email bodies.
   */
  await transporter.sendMail({
    from: `Tamim Market App <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  });
};

module.exports = sendEmail;
