import type { AdAccount, Client } from "@shared/schema";

interface EmailTemplateData {
  adAccount: AdAccount;
  client: Client;
  availableBalance?: string;
  spendPercentage?: number;
  threshold?: number;
}

export function getAdAccountActivationEmailTemplate(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const { adAccount, client } = data;
  const totalSpend = parseFloat((adAccount.totalSpend || 0).toString());
  const spendLimit = parseFloat(adAccount.spendLimit.toString());
  const availableBalance = (spendLimit - totalSpend).toFixed(2);

  const subject = `🎯 Ad Account Activated - ${adAccount.accountName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .details-box { background: #f9fafb; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-weight: 600; color: #6b7280; }
    .detail-value { font-weight: 700; color: #111827; }
    .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-size: 14px; margin: 10px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none; color: #6b7280; font-size: 14px; }
    .divider { border-top: 2px solid #e5e7eb; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 Ad Account Activated</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px; margin-top: 0;">Dear <strong>${client.contactPerson}</strong>,</p>
      <p>Your ad account has been <strong>activated successfully</strong> and is now ready to run campaigns!</p>
      
      <div class="success-badge">✓ Account Active</div>
      
      <div class="details-box">
        <h3 style="margin-top: 0; color: #2563eb;">Account Details</h3>
        <div class="detail-row">
          <span class="detail-label">📌 Ad Account Name:</span>
          <span class="detail-value">${adAccount.accountName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">🏢 Client:</span>
          <span class="detail-value">${client.clientName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">🌐 Platform:</span>
          <span class="detail-value">${adAccount.platform.toUpperCase()}</span>
        </div>
        <div class="divider"></div>
        <div class="detail-row">
          <span class="detail-label">💰 Total Spend:</span>
          <span class="detail-value">$${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">💵 Available Balance:</span>
          <span class="detail-value" style="color: #10b981;">$${parseFloat(availableBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">📊 Spend Limit:</span>
          <span class="detail-value">$${spendLimit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
      
      <p style="margin-bottom: 0;">Your account is now ready to run campaigns. If you have any questions, please don't hesitate to contact us.</p>
    </div>
    <div class="footer">
      <p style="margin: 0;">Best regards,<br><strong>Advantix Admin Team</strong></p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
AD ACCOUNT ACTIVATED

Dear ${client.contactPerson},

Your ad account has been activated successfully!

Account Details:
━━━━━━━━━━━━━━━━━━━━━━
📌 Ad Account Name: ${adAccount.accountName}
🏢 Client: ${client.clientName}
🌐 Platform: ${adAccount.platform.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━
💰 Total Spend: $${totalSpend.toFixed(2)}
💵 Available Balance: $${availableBalance}
📊 Spend Limit: $${spendLimit.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━

Your account is now ready to run campaigns!

Best regards,
Advantix Admin Team
  `;

  return { subject, html, text };
}

export function getAdAccountSuspensionEmailTemplate(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const { adAccount, client } = data;
  const totalSpend = parseFloat((adAccount.totalSpend || 0).toString());
  const spendLimit = parseFloat(adAccount.spendLimit.toString());
  const availableBalance = (spendLimit - totalSpend).toFixed(2);

  const subject = `⚠️ Ad Account Suspended - ${adAccount.accountName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .details-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #fecaca; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-weight: 600; color: #6b7280; }
    .detail-value { font-weight: 700; color: #111827; }
    .warning-badge { background: #ef4444; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-size: 14px; margin: 10px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none; color: #6b7280; font-size: 14px; }
    .divider { border-top: 2px solid #fecaca; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Ad Account Suspended</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px; margin-top: 0;">Dear <strong>${client.contactPerson}</strong>,</p>
      <p>Your ad account has been <strong>suspended</strong>. All active campaigns have been paused.</p>
      
      <div class="warning-badge">⚠ Account Suspended</div>
      
      <div class="details-box">
        <h3 style="margin-top: 0; color: #ef4444;">Account Details</h3>
        <div class="detail-row">
          <span class="detail-label">📌 Ad Account Name:</span>
          <span class="detail-value">${adAccount.accountName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">🏢 Client:</span>
          <span class="detail-value">${client.clientName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">🌐 Platform:</span>
          <span class="detail-value">${adAccount.platform.toUpperCase()}</span>
        </div>
        <div class="divider"></div>
        <div class="detail-row">
          <span class="detail-label">💰 Total Spend:</span>
          <span class="detail-value">$${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">💵 Available Balance:</span>
          <span class="detail-value">$${parseFloat(availableBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">📊 Spend Limit:</span>
          <span class="detail-value">$${spendLimit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
      
      <p>If you have any questions about this suspension, please contact us immediately.</p>
    </div>
    <div class="footer">
      <p style="margin: 0;">Best regards,<br><strong>Advantix Admin Team</strong></p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
AD ACCOUNT SUSPENDED

Dear ${client.contactPerson},

Your ad account has been suspended. All active campaigns have been paused.

Account Details:
━━━━━━━━━━━━━━━━━━━━━━
📌 Ad Account Name: ${adAccount.accountName}
🏢 Client: ${client.clientName}
🌐 Platform: ${adAccount.platform.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━
💰 Total Spend: $${totalSpend.toFixed(2)}
💵 Available Balance: $${availableBalance}
📊 Spend Limit: $${spendLimit.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━

If you have any questions, please contact us immediately.

Best regards,
Advantix Admin Team
  `;

  return { subject, html, text };
}

export function getSpendAlertEmailTemplate(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const { adAccount, client, threshold } = data;
  const totalSpend = parseFloat((adAccount.totalSpend || 0).toString());
  const spendLimit = parseFloat(adAccount.spendLimit.toString());
  const availableBalance = (spendLimit - totalSpend).toFixed(2);
  const spendPercentage = ((totalSpend / spendLimit) * 100).toFixed(1);

  const subject = `⚡ Spend Alert: ${threshold}% Limit Reached - ${adAccount.accountName}`;

  const alertColor = threshold === 100 ? '#ef4444' : threshold === 90 ? '#f59e0b' : '#eab308';
  const alertBg = threshold === 100 ? '#fef2f2' : threshold === 90 ? '#fffbeb' : '#fefce8';
  const alertBorder = threshold === 100 ? '#fecaca' : threshold === 90 ? '#fde68a' : '#fef08a';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, ${alertColor} 0%, ${alertColor}dd 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .details-box { background: ${alertBg}; border-left: 4px solid ${alertColor}; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid ${alertBorder}; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-weight: 600; color: #6b7280; }
    .detail-value { font-weight: 700; color: #111827; }
    .alert-badge { background: ${alertColor}; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-size: 14px; margin: 10px 0; }
    .progress-bar { background: #e5e7eb; height: 30px; border-radius: 15px; overflow: hidden; margin: 20px 0; }
    .progress-fill { background: ${alertColor}; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; transition: width 0.3s; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚡ Spend Limit Alert: ${threshold}%</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px; margin-top: 0;">Dear <strong>${client.contactPerson}</strong>,</p>
      <p>Your ad account has reached <strong>${spendPercentage}%</strong> of its spend limit.</p>
      
      <div class="alert-badge">⚡ ${threshold}% Threshold Reached</div>
      
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${spendPercentage}%">${spendPercentage}%</div>
      </div>
      
      <div class="details-box">
        <h3 style="margin-top: 0; color: ${alertColor};">Account Details</h3>
        <div class="detail-row">
          <span class="detail-label">📌 Ad Account Name:</span>
          <span class="detail-value">${adAccount.accountName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">🏢 Client:</span>
          <span class="detail-value">${client.clientName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">💰 Total Spend:</span>
          <span class="detail-value" style="color: ${alertColor};">$${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">💵 Available Balance:</span>
          <span class="detail-value">$${parseFloat(availableBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">📊 Spend Limit:</span>
          <span class="detail-value">$${spendLimit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
      
      <p>${threshold === 100 ? '<strong style="color: ' + alertColor + ';">⚠️ Your account has reached its spend limit. Please top up to continue running campaigns.</strong>' : 'Please monitor your spending closely to avoid service interruption.'}</p>
    </div>
    <div class="footer">
      <p style="margin: 0;">Best regards,<br><strong>Advantix Admin Team</strong></p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
SPEND LIMIT ALERT: ${threshold}%

Dear ${client.contactPerson},

Your ad account has reached ${spendPercentage}% of its spend limit.

Account Details:
━━━━━━━━━━━━━━━━━━━━━━
📌 Ad Account Name: ${adAccount.accountName}
🏢 Client: ${client.clientName}
💰 Total Spend: $${totalSpend.toFixed(2)}
💵 Available Balance: $${availableBalance}
📊 Spend Limit: $${spendLimit.toFixed(2)}
⚡ Usage: ${spendPercentage}%
━━━━━━━━━━━━━━━━━━━━━━

${threshold === 100 ? 'Your account has reached its spend limit. Please top up to continue running campaigns.' : 'Please monitor your spending closely.'}

Best regards,
Advantix Admin Team
  `;

  return { subject, html, text };
}
