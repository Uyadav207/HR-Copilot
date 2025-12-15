import nodemailer from "nodemailer";
import { settings } from "../config.js";

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Create reusable transporter object using SMTP transport
    this.transporter = nodemailer.createTransport({
      host: settings.emailHost,
      port: settings.emailPort,
      secure: false, // true for 465, false for other ports
      auth: {
        user: settings.emailUser,
        pass: settings.emailPass,
      },
    });
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    body: string;
    from?: string;
  }): Promise<void> {
    // Convert plain text to HTML with proper formatting
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .email-content {
              background-color: #ffffff;
              padding: 30px;
              border-radius: 8px;
            }
          </style>
        </head>
        <body>
          <div class="email-content">
            ${options.body.replace(/\n/g, "<br>")}
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: options.from || settings.emailFrom,
      to: options.to || settings.emailTo,
      subject: options.subject,
      text: options.body,
      html: htmlBody,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully: ${info.messageId}`);
      console.log(`   To: ${options.to}`);
      console.log(`   Subject: ${options.subject}`);
    } catch (error) {
      console.error(`❌ Error sending email:`, error);
      throw new Error(`Failed to send email: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async sendEmailDraft(
    candidateEmail: string,
    subject: string,
    body: string
  ): Promise<void> {
    await this.sendEmail({
      to: candidateEmail,
      subject,
      body,
    });
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log("✅ SMTP server connection verified");
      return true;
    } catch (error) {
      console.error("❌ SMTP server connection failed:", error);
      return false;
    }
  }
}
