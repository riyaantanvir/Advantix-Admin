import type { EmailSetting } from "@shared/schema";

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(settings: EmailSetting, emailData: EmailData): Promise<boolean> {
  try {
    if (!settings || !settings.apiKey) {
      console.error("Email settings not configured");
      return false;
    }

    console.log(`Sending email via ${settings.provider} to ${emailData.to}`);
    let response;

    if (settings.provider === 'resend') {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `${settings.senderName} <${settings.senderEmail}>`,
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text
        })
      });
    } else if (settings.provider === 'sendgrid') {
      response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: emailData.to }]
          }],
          from: {
            email: settings.senderEmail,
            name: settings.senderName
          },
          subject: emailData.subject,
          content: [
            {
              type: 'text/html',
              value: emailData.html
            },
            {
              type: 'text/plain',
              value: emailData.text
            }
          ]
        })
      });
    } else if (settings.provider === 'mailgun') {
      const domain = settings.senderEmail.split('@')[1];
      response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${settings.apiKey}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          from: `${settings.senderName} <${settings.senderEmail}>`,
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text
        }).toString()
      });
    } else {
      console.error(`Unsupported email provider: ${settings.provider}`);
      return false;
    }

    if (!response || !response.ok) {
      const errorData = await response?.text();
      console.error("Email send error:", errorData);
      return false;
    }

    const responseData = await response.json();
    console.log("Email sent successfully:", responseData);
    return true;
  } catch (error) {
    console.error("Send email error:", error);
    return false;
  }
}
