const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';

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
    let fullItems = [...digitalItems];
    let categories: any[] = [];
    
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch(`${API_BASE}/api/products`),
        fetch(`${API_BASE}/api/categories`)
      ]);
      
      if (catRes.ok) {
        categories = await catRes.json();
      }

      if (prodRes.ok) {
        const { products } = await prodRes.json();
        if (products && products.length > 0) {
          fullItems = digitalItems.map(item => {
            const searchEmail = (item.email || '').trim().toLowerCase();
            const searchCode = (item.code || '').trim().toLowerCase();
            
            // First pass: try matching by email
            if (searchEmail) {
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
                    categoryId: prod.category_slug,
                    _productData: prod
                  };
                }
              }
            }
            
            // Second pass: try matching by exact code (for gift cards that don't have emails)
            if (searchCode && !searchEmail) {
              for (const prod of products) {
                const prodItems = Array.isArray(prod.digitalItems) ? prod.digitalItems : [];
                const matched = prodItems.find((pi: any) => (pi.code || '').trim().toLowerCase() === searchCode);
                if (matched) {
                  return {
                    ...matched,
                    name: item.name || prod.name,
                    code: matched.code,
                    categoryId: prod.category_slug,
                    _productData: prod
                  };
                }
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
      // Determine the category and rules
      const categorySlug = item.categoryId || '';
      const categoryData = categories.find(c => c.slug === categorySlug);
      const emailRules = categoryData?.email_rules || categoryData?.emailRules || '';
      
      // Determine the selected slot/attribute from the order or item name
      const productNameLower = (order.product_name || '').toLowerCase();
      let selectedSlotName = '';
      if (productNameLower.includes('primary ps5')) selectedSlotName = 'Primary PS5';
      else if (productNameLower.includes('primary ps4')) selectedSlotName = 'Primary PS4';
      else if (productNameLower.includes('secondary')) selectedSlotName = 'Secondary';
      else if (productNameLower.includes('offline ps5')) selectedSlotName = 'Offline PS5';
      else if (productNameLower.includes('offline ps4')) selectedSlotName = 'Offline PS4';

      let matchedSlotKey = '';
      let selectedSlotCode = '';
      if (item.slots && selectedSlotName) {
        const keys = Object.keys(item.slots);
        matchedSlotKey = keys.find(k => k.toLowerCase() === selectedSlotName.toLowerCase()) || '';
        if (matchedSlotKey) {
          selectedSlotCode = item.slots[matchedSlotKey]?.code || '';
        }
      }

      const isAccountType = !!(item.email || item.password);
      const isCodeOnlyType = !isAccountType && !!(item.code || selectedSlotCode);

      // --- STUNNING GAMESUP THEME HTML ---
      let html = `
        <div style="margin-bottom: 30px; border: 1px solid #27272a; padding: 24px; border-radius: 16px; background: linear-gradient(145deg, #18181b, #09090b); box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif; color: #e4e4e7;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #3f3f46; padding-bottom: 12px;">
            <h3 style="margin: 0; color: #fafafa; font-size: 18px; font-weight: 700; letter-spacing: -0.02em;">${item.name || 'Digital Product'}</h3>
            ${matchedSlotKey ? `<span style="background-color: #7f1d1d; color: #fecaca; font-size: 11px; padding: 4px 10px; border-radius: 9999px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${matchedSlotKey}</span>` : ''}
          </div>
      `;

      if (isAccountType) {
        html += `
          <div style="background-color: #18181b; border: 1px solid #3f3f46; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0 0 12px 0; font-size: 13px; color: #a1a1aa; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Account Credentials</p>
            
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${item.email ? `
              <div>
                <span style="font-size: 12px; color: #71717a; display: block; margin-bottom: 4px;">Sign-in ID (Email)</span>
                <div style="background-color: #000; padding: 10px 14px; border-radius: 8px; border: 1px solid #27272a; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 14px; color: #ef4444; font-weight: 600;">${item.email}</div>
              </div>` : ''}
              
              ${item.password ? `
              <div>
                <span style="font-size: 12px; color: #71717a; display: block; margin-bottom: 4px;">Password</span>
                <div style="background-color: #000; padding: 10px 14px; border-radius: 8px; border: 1px solid #27272a; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 14px; color: #ef4444; font-weight: 600;">${item.password}</div>
              </div>` : ''}
            </div>
          </div>
        `;

        if (selectedSlotCode || item.code) {
          const displayCode = selectedSlotCode || item.code;
          html += `
            <div style="background-color: #18181b; border: 1px solid #3f3f46; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
              <p style="margin: 0 0 12px 0; font-size: 13px; color: #a1a1aa; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Activation / Pin Code</p>
              <div style="background-color: #000; padding: 12px 16px; border-radius: 8px; border: 1px solid #dc2626; text-align: center;">
                <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 18px; font-weight: 700; letter-spacing: 2px; color: #f87171;">${displayCode}</span>
              </div>
            </div>
          `;
        }
      } else if (isCodeOnlyType) {
        // Pure gift card or key
        html += `
          <div style="background-color: #18181b; border: 1px solid #3f3f46; border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: center;">
            <p style="margin: 0 0 12px 0; font-size: 13px; color: #a1a1aa; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Your Digital Code</p>
            <div style="background-color: #000; padding: 16px; border-radius: 8px; border: 1px solid #dc2626; display: inline-block; min-width: 250px;">
              <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 20px; font-weight: 700; letter-spacing: 3px; color: #f87171;">${item.code || selectedSlotCode}</span>
            </div>
          </div>
        `;
      }

      // Additional Security Info
      if (item.outlookEmail || item.backupCodes || item.birthdate) {
        html += `<div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <p style="margin: 0 0 12px 0; font-size: 13px; color: #a1a1aa; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Security & Recovery Details</p>
          <div style="display: grid; gap: 8px; font-size: 13px;">`;
          
        if (item.outlookEmail) html += `<div><span style="color: #71717a;">Recovery Email:</span> <strong style="color: #d4d4d8;">${item.outlookEmail}</strong></div>`;
        if (item.outlookPassword) html += `<div><span style="color: #71717a;">Recovery Password:</span> <strong style="color: #d4d4d8;">${item.outlookPassword}</strong></div>`;
        if (item.birthdate) html += `<div><span style="color: #71717a;">Birthdate:</span> <strong style="color: #d4d4d8;">${item.birthdate}</strong></div>`;
        if (item.region) html += `<div><span style="color: #71717a;">Region:</span> <strong style="color: #d4d4d8;">${item.region}</strong></div>`;
        
        if (item.backupCodes) {
          html += `
            <div style="margin-top: 8px;">
              <span style="color: #71717a; display: block; margin-bottom: 6px;">2FA Backup Codes:</span>
              <pre style="background: #000; padding: 10px; border: 1px solid #3f3f46; border-radius: 6px; white-space: pre-wrap; font-family: monospace; font-size: 12px; color: #93c5fd; margin: 0;">${item.backupCodes}</pre>
            </div>
          `;
        }
        html += `</div></div>`;
      }

      // Add dynamic Category Rules
      if (emailRules) {
        html += `
          <div style="background-color: #27272a; border-left: 4px solid #dc2626; border-radius: 0 8px 8px 0; padding: 16px; margin-top: 24px;">
            <p style="margin: 0; font-size: 13px; color: #d4d4d8; line-height: 1.6; white-space: pre-wrap;">${emailRules}</p>
          </div>
        `;
      }

      html += `</div>`;
      return html;
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
