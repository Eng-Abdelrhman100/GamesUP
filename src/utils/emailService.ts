const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';

export const emailService = {
  /**
   * Send an email using Supabase Edge Function
   */
  sendEmail: async (to: string, templateType: string, data: any) => {
    try {
      console.log(`[EmailService] Attempting to send '${templateType}' email to ${to}`);

      let template: any = null;
      try {
        const res = await fetch(`${API_BASE}/api/email-templates?type=${encodeURIComponent(templateType)}`);
        if (res.ok) template = await res.json();
      } catch (err) {
        console.warn('[EmailService] Could not fetch template from DB, using fallback');
      }

      if (!template) {
        if (templateType === 'order_confirmation') {
          template = {
            subject: 'Order Confirmation #{{orderId}}',
            body: 'Hello {{name}},\n\nThank you for your order #{{orderId}}!\n\nTotal: {{total}}\nDate: {{date}}\n\nYour order is currently being processed. You will receive another email once it is completed.'
          };
        } else if (templateType === 'digital_delivery') {
          template = {
            subject: 'Your Digital Items for Order #{{orderId}}',
            body: 'Hello {{name}},\n\nYour order #{{orderId}} is complete! Here are your digital items:\n\n{{digitalCodes}}\n\nThank you for shopping with us!'
          };
        } else {
          template = {
            subject: 'Notification',
            body: 'You have a new notification.'
          };
        }
      }

      let subject = template.subject;
      let body = template.body;

      Object.keys(data).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        const value = data[key] || '';
        subject = subject.replace(regex, value);
        body = body.replace(regex, value);
      });

      const smtpUrl = (import.meta as any).env?.VITE_SMTP_API_URL || `${API_BASE}/api/send-email`;
      const response = await fetch(smtpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, subject, html: body }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      return { success: true, ...result };

    } catch (error) {
      console.error('[EmailService] Error sending email:', error);
      return { success: false, error };
    }
  },

  /**
   * Send Order Confirmation Email
   */
  sendOrderConfirmation: async (order: any) => {
    return emailService.sendEmail(order.customer_email, 'order_confirmation', {
      name: order.customer_name,
      orderId: order.order_number || order.id,
      total: order.amount,
      date: new Date().toLocaleDateString()
    });
  },

  /**
   * Send Digital Delivery Email (Completed Order) - Legacy format
   */
  sendDigitalDelivery: async (order: any, digitalItems: any[]) => {
    const codesHtml = digitalItems.map(item => `
      <div style="margin-bottom: 20px; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; background-color: #f8fafc;">
        <h3 style="margin: 0 0 10px 0; color: #1e293b;">${item.name}</h3>
        <div style="font-family: monospace; font-size: 14px; color: #334155;">
          ${item.code ? `<div><strong>Code:</strong> ${item.code}</div>` : ''}
          ${item.email ? `<div><strong>Email:</strong> ${item.email}</div>` : ''}
          ${item.password ? `<div><strong>Password:</strong> ${item.password}</div>` : ''}
          ${item.outlookEmail ? `<div><strong>Outlook Email:</strong> ${item.outlookEmail}</div>` : ''}
          ${item.outlookPassword ? `<div><strong>Outlook Password:</strong> ${item.outlookPassword}</div>` : ''}
          ${item.birthdate ? `<div><strong>Birthdate:</strong> ${item.birthdate}</div>` : ''}
          ${item.region ? `<div><strong>Region:</strong> ${item.region}</div>` : ''}
          ${item.onlineId ? `<div><strong>Online ID:</strong> ${item.onlineId}</div>` : ''}
          ${item.backupCodes ? `<div style="margin-top: 10px;"><strong>Backup Codes:</strong><br/><pre style="background: #fff; padding: 5px; border: 1px solid #cbd5e1; border-radius: 4px; white-space: pre-wrap;">${item.backupCodes}</pre></div>` : ''}
        </div>
      </div>
    `).join('');

    return emailService.sendEmail(order.customer_email, 'digital_delivery', {
      name: order.customer_name,
      orderId: order.order_number || order.id,
      digitalCodes: codesHtml
    });
  },

  /**
   * Send Product-Specific Custom Email (using per-product template)
   * This is called when an order is completed and the product has sendEmailEnabled
   */
  sendProductEmail: async (order: any, product: any, digitalItem: any) => {
    try {
      console.log(`[EmailService] Sending product email for order ${order.order_number || order.id}`);

      if (!product.sendEmailEnabled || !product.emailTemplate) {
        console.log('[EmailService] Product email not enabled or no template, skipping');
        return { success: false, error: 'Email not enabled for this product' };
      }

      let subject = `Order Confirmation - ${product.name}`;
      let body = product.emailTemplate;

      // Special case: If template is a keyword for a predefined template
      if (product.emailTemplate === 'rules_for_games') {
        let dbTemplate: any = null;
        try {
          const res = await fetch(`${API_BASE}/api/email-templates?type=rules_for_games`);
          if (res.ok) dbTemplate = await res.json();
        } catch {}
        
        if (dbTemplate) {
          subject = dbTemplate.subject;
          body = dbTemplate.body;
        } else {
          // Fallback if template not found in DB
          subject = 'Important Rules for Your Game';
          body = '<h1>Game Rules</h1><p>Hello {{name}},</p><p>Please follow the safety guidelines for {{productName}}.</p><p>Account: {{email}}<br>Password: {{password}}</p>';
        }
      }

      const placeholders: Record<string, string> = {
        email: digitalItem?.email || '',
        password: digitalItem?.password || '',
        code: digitalItem?.code || '',
        name: order.customer_name || '',
        orderNumber: order.order_number || order.id || '',
        productName: product.name || '',
      };

      Object.keys(placeholders).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        const value = placeholders[key] || '';
        subject = subject.replace(regex, value);
        body = body.replace(regex, value);
      });

      return emailService.sendEmail(order.customer_email, 'product_custom', {
        ...placeholders,
        customSubject: subject,
        customBody: body
      });
    } catch (error) {
      console.error('[EmailService] Error sending product email:', error);
      return { success: false, error };
    }
  }
};
