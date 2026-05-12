import nodemailer from 'nodemailer';
import { logger } from '../config/logger.js';
import { config } from '../config/index.js';
import { getOtpTemplate, getWelcomeTemplate } from '../templates/index.js';

const transporter = nodemailer.createTransport({
     service: 'gmail',
     auth: {
          user: config.GMAIL_USER,
          pass: config.GMAIL_APP_PASSWORD,
     },
});

class EmailService {
     constructor() {
          this.from = `"BookMe" <${config.MAIL_SEND}>`;
          this.maxRetries = 3;
     }

     async sendWithRetry(msg, retries = 0) {
          try {
               await transporter.sendMail(msg);
               logger.info(`Email sent successfully to ${msg.to}`, {
                    subject: msg.subject,
                    attempt: retries + 1
               });
               return { success: true };
          } catch (error) {
               logger.error(`Email sending failed (attempt ${retries + 1}/${this.maxRetries})`, {
                    to: msg.to,
                    error: error.message,
                    code: error.code,
               });
               if (retries < this.maxRetries - 1) {
                    const delay = Math.pow(2, retries) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this.sendWithRetry(msg, retries + 1);
               }
               throw error;
          }
     }

     async sendOtpEmail(email, otp, ttlMinutes) {
          const msg = {
               to: email,
               from: this.from,
               subject: 'Your BookMe verification code',
               html: getOtpTemplate(otp, ttlMinutes),
          };
          return this.sendWithRetry(msg);
     }

     async sendWelcomeEmail(email, firstName) {
          const msg = {
               to: email,
               from: this.from,
               subject: 'Welcome to BookMe - Email Verified',
               html: getWelcomeTemplate(firstName),
          };
          return this.sendWithRetry(msg);
     }
}

export const emailService = new EmailService();