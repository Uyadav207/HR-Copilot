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
    // Convert plain text to HTML with proper formatting, structure, and indentation
    // Preserve line breaks and add proper spacing
    const formattedBody = options.body
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // Add proper indentation for paragraphs
        if (line.startsWith('Dear') || line.startsWith('We are') || line.startsWith('Your') || line.startsWith('However') || line.startsWith('We appreciate') || line.startsWith('Best regards')) {
          return `            <p style="margin: 0 0 16px 0; padding: 0;">${line}</p>`;
        }
        return `            <p style="margin: 0 0 16px 0; padding: 0;">${line}</p>`;
      })
      .join('\n');
    
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
              background-color: #f5f5f5;
            }
            .email-content {
              background-color: #ffffff;
              padding: 40px;
              border-radius: 4px;
              border: 1px solid #e0e0e0;
            }
            p {
              margin: 0 0 16px 0;
              padding: 0;
              text-align: left;
            }
          </style>
        </head>
        <body>
          <div class="email-content">
${formattedBody}
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
