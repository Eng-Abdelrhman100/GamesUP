import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS?.replace(/"/g, ''),
  },
});

export async function sendEmail(req, res) {
  const { to, subject, html } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || '"GamesUp Platform" <info@games-up.co>',
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.warn('Primary SMTP failed, trying Ethereal fallback...', error.message);
    try {
      const testAccount = await nodemailer.createTestAccount();
      
      const etherealTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      const info = await etherealTransporter.sendMail({
        from: '"GamesUp Platform (Ethereal Fallback)" <no-reply@gamesup.store>',
        to,
        subject,
        html,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('Ethereal Fallback Success! Message ID:', info.messageId);
      console.log('Preview URL:', previewUrl);

      res.status(200).json({
        success: true,
        messageId: info.messageId,
        isEthereal: true,
        previewUrl,
      });
    } catch (fallbackError) {
      console.error('Ethereal Fallback also failed:', fallbackError);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
