const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || process.env.VITE_API_BASE_URL || '';

export const emailService = {
  /**
   * Send an email using the backend API
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

      const smtpUrl = (import.meta as any).env?.VITE_SMTP_API_URL || process.env.VITE_SMTP_API_URL || `${API_BASE}/api/send-email`;
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
    // Try to find the full digital item details from the products API
    let fullItems = [...digitalItems];
    try {
      const res = await fetch(`${API_BASE}/api/products`);
      if (res.ok) {
        const { products } = await res.json();
        if (products && products.length > 0) {
          fullItems = digitalItems.map(item => {
            const searchEmail = (item.email || '').trim().toLowerCase();
            if (!searchEmail) return item;
            
            for (const prod of products) {
              const prodItems = Array.isArray(prod.digitalItems) ? prod.digitalItems : [];
              const matched = prodItems.find((pi: any) => (pi.email || '').trim().toLowerCase() === searchEmail);
              if (matched) {
                return {
                  ...matched,
                  name: item.name || prod.name,
                  code: item.code || matched.code,
                  email: item.email || matched.email,
                  password: item.password || matched.password,
                };
              }
            }
            return item;
          });
        }
      }
    } catch (e) {
      console.warn('[EmailService] Failed to fetch full digital items details from DB, using fallback', e);
    }

    const codesHtml = fullItems.map(item => {
      // Determine the selected slot/attribute from the order or item name
      const productNameLower = (order.product_name || '').toLowerCase();
      let selectedSlotName = '';
      if (productNameLower.includes('primary ps5')) selectedSlotName = 'Primary PS5';
      else if (productNameLower.includes('primary ps4')) selectedSlotName = 'Primary PS4';
      else if (productNameLower.includes('secondary')) selectedSlotName = 'Secondary';
      else if (productNameLower.includes('offline ps5')) selectedSlotName = 'Offline PS5';
      else if (productNameLower.includes('offline ps4')) selectedSlotName = 'Offline PS4';

      let matchedSlotKey = '';
      if (item.slots && selectedSlotName) {
        const keys = Object.keys(item.slots);
        matchedSlotKey = keys.find(k => k.toLowerCase() === selectedSlotName.toLowerCase()) || '';
      }

      const selectedSlot = matchedSlotKey ? item.slots[matchedSlotKey] : null;
      const selectedSlotHtml = selectedSlot 
        ? `<div style="margin-top: 10px; margin-bottom: 10px; padding: 12px; background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px;">
             <strong style="color: #dc2626; font-size: 14px;">Selected Option (${matchedSlotKey}):</strong>
             <span style="font-family: monospace; font-size: 15px; font-weight: bold; margin-left: 8px; letter-spacing: 1px; color: #b91c1c;">${selectedSlot.code || 'Pending Delivery'}</span>
           </div>`
        : '';

      const mainCodeHtml = (!selectedSlotHtml && item.code)
        ? `<div style="margin-top: 10px; margin-bottom: 10px; padding: 12px; background-color: #f0fdf4; border: 1px solid #dcfce7; border-radius: 8px;">
             <strong style="color: #16a34a; font-size: 14px;">License Code:</strong>
             <span style="font-family: monospace; font-size: 15px; font-weight: bold; margin-left: 8px; letter-spacing: 1px; color: #15803d;">${item.code}</span>
           </div>`
        : '';

      let allSlotsHtml = '';
      if (item.slots && Object.keys(item.slots).length > 0) {
        const slotsList = Object.entries(item.slots).map(([name, data]: [string, any]) => {
          const isSelected = name.toLowerCase() === (matchedSlotKey || '').toLowerCase();
          const itemStyle = isSelected 
            ? 'color: #dc2626; font-weight: bold; background-color: #fee2e2; padding: 4px 8px; border-radius: 6px; border: 1px solid #fecaca; margin-bottom: 6px;' 
            : 'color: #475569; margin-bottom: 4px; padding: 2px 0;';
          return `<li style="${itemStyle}">
            <strong>${name}:</strong> ${data.code || 'N/A'} ${data.sold && !isSelected ? '<span style="color: #94a3b8; font-size: 11px; margin-left: 6px;">(Sold)</span>' : ''}
          </li>`;
        }).join('');
        
        allSlotsHtml = `
          <div style="margin-top: 15px; padding-top: 15px; border-t: 1px dashed #cbd5e1;">
            <strong style="color: #1e293b; display: block; margin-bottom: 8px; font-size: 13px;">Stock Account Allocation Details (All Active Slots):</strong>
            <ul style="list-style-type: none; padding-left: 0; margin: 0;">
              ${slotsList}
            </ul>
          </div>
        `;
      }

      return `
        <div style="margin-bottom: 25px; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">${item.name}</h3>
          
          <div style="font-size: 14px; color: #334155; line-height: 1.6;">
            ${item.email ? `<div><strong>Account Email:</strong> ${item.email}</div>` : ''}
            ${item.password ? `<div><strong>Account Password:</strong> ${item.password}</div>` : ''}
            ${item.birthdate ? `<div><strong>Birthdate:</strong> ${item.birthdate}</div>` : ''}
            
            ${selectedSlotHtml}
            ${mainCodeHtml}

            ${item.outlookEmail ? `<div style="margin-top: 8px;"><strong>Recovery Email (Outlook):</strong> ${item.outlookEmail}</div>` : ''}
            ${item.outlookPassword ? `<div><strong>Recovery Password:</strong> ${item.outlookPassword}</div>` : ''}
            ${item.region ? `<div><strong>Region:</strong> ${item.region}</div>` : ''}
            ${item.onlineId ? `<div><strong>Online ID:</strong> ${item.onlineId}</div>` : ''}
            
            ${item.backupCodes ? `
              <div style="margin-top: 12px;">
                <strong>2FA Backup Codes:</strong>
                <pre style="background: #ffffff; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; white-space: pre-wrap; font-family: monospace; font-size: 12px; color: #0f172a; margin-top: 4px;">${item.backupCodes}</pre>
              </div>
            ` : ''}

            ${allSlotsHtml}
          </div>
        </div>
      `;
    }).join('');

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
