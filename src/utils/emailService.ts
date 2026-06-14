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
        } else if (templateType === 'status_update') {
          template = {
            subject: 'Order Status Update #{{orderId}}',
            body: 'Hello {{name}},\n\nYour order #{{orderId}} is now marked as {{status}}!\n\nTotal: {{total}}\nDate: {{date}}\n\nThank you for shopping with us!'
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
    let rulesForGamesBody = '';
    
    try {
      const [prodRes, catRes, rulesRes] = await Promise.all([
        fetch(`${API_BASE}/api/products`),
        fetch(`${API_BASE}/api/categories`),
        fetch(`${API_BASE}/api/email-templates?type=rules_for_games`).catch(() => null)
      ]);
      
      if (catRes.ok) {
        categories = await catRes.json();
      }

      if (rulesRes && rulesRes.ok) {
        try {
          const rulesTemplate = await rulesRes.json();
          rulesForGamesBody = rulesTemplate?.body || '';
        } catch (e) {}
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
      
      const product = item._productData;
      let customTemplateBody = '';
      let isRulesTemplate = false;

      if (product && product.sendEmailEnabled) {
        const rawTemplate = product.emailTemplate || '';
        if (rawTemplate === 'rules_for_games') {
          isRulesTemplate = true;
          customTemplateBody = '';
        } else if (rawTemplate.startsWith('__rules_template__\n')) {
          isRulesTemplate = true;
          customTemplateBody = rawTemplate.substring('__rules_template__\n'.length);
        } else if (rawTemplate.startsWith('__rules_template__')) {
          isRulesTemplate = true;
          customTemplateBody = rawTemplate.substring('__rules_template__'.length);
        } else {
          isRulesTemplate = false;
          customTemplateBody = rawTemplate;
        }
      }

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
        matchedSlotKey = keys.find(k => 
          k.toLowerCase() === selectedSlotName.toLowerCase() ||
          k.toLowerCase().endsWith(selectedSlotName.toLowerCase()) ||
          k.toLowerCase().includes(selectedSlotName.toLowerCase())
        ) || '';
        if (matchedSlotKey) {
          selectedSlotCode = item.slots[matchedSlotKey]?.code || '';
        }
      }

      // --- STUNNING GAMESUP THEME HTML ---
      let html = `
        <div style="margin-bottom: 40px; border: 1px solid #3f3f46; padding: 32px; border-radius: 24px; background: linear-gradient(160deg, #111114 0%, #050505 100%); box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; border-bottom: 2px solid #ef4444; padding-bottom: 16px;">
            <h3 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">${item.name || 'Digital Product'}</h3>
            ${matchedSlotKey ? `<span style="background: linear-gradient(to right, #991b1b, #dc2626); color: #ffffff; font-size: 11px; padding: 6px 14px; border-radius: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);">${matchedSlotKey}</span>` : ''}
          </div>
      `;

      let contentHtml = '';
      if (product && product.sendEmailEnabled && customTemplateBody) {
        let rendered = customTemplateBody;
        const placeholders: Record<string, string> = {
          email: item.email || '',
          password: item.password || '',
          code: item.code || selectedSlotCode || '',
          name: order.customer_name || '',
          orderNumber: order.order_number || order.id || '',
          productName: item.name || '',
        };
        Object.keys(placeholders).forEach(key => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          const value = placeholders[key] || '';
          rendered = rendered.replace(regex, value);
        });

        const formatted = rendered.includes('<') && rendered.includes('>')
          ? rendered
          : rendered.replace(/\n/g, '<br>');

        contentHtml = `
          <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 20px; margin-bottom: 24px; line-height: 1.8; color: #d4d4d8;">
            ${formatted}
          </div>
        `;

        if ((item.outlookEmail || item.birthdate || item.twoFactorCode) &&
            !customTemplateBody.includes('outlookEmail') &&
            !customTemplateBody.includes('birthdate') && !customTemplateBody.includes('twoFactorCode')) {
          contentHtml += `<div style="background-color: #09090b; border: 1px solid #18181b; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 16px 0; font-size: 13px; color: #ef4444; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Security & Recovery Details</p>
            <div style="display: grid; gap: 12px; font-size: 14px;">`;
            
          if (item.outlookEmail) contentHtml += `<div style="padding: 8px 0; border-bottom: 1px solid #18181b;"><span style="color: #71717a;">Recovery Email:</span> <strong style="color: #ffffff; margin-left: 8px;">${item.outlookEmail}</strong></div>`;
          if (item.outlookPassword) contentHtml += `<div style="padding: 8px 0; border-bottom: 1px solid #18181b;"><span style="color: #71717a;">Recovery Password:</span> <strong style="color: #ffffff; margin-left: 8px;">${item.outlookPassword}</strong></div>`;
          if (item.birthdate) contentHtml += `<div style="padding: 8px 0; border-bottom: 1px solid #18181b;"><span style="color: #71717a;">Birthdate:</span> <strong style="color: #ffffff; margin-left: 8px;">${item.birthdate}</strong></div>`;
          if (item.region) contentHtml += `<div style="padding: 8px 0; border-bottom: 1px solid #18181b;"><span style="color: #71717a;">Region:</span> <strong style="color: #ffffff; margin-left: 8px;">${item.region}</strong></div>`;
          if (item.twoFactorCode) contentHtml += `<div style="margin-top: 8px; background: #450a0a; border: 1px solid #991b1b; padding: 12px; border-radius: 8px;"><span style="color: #fecaca; display: block; margin-bottom: 4px; font-size: 12px; font-weight: 700;">2FA Secret Key:</span> <strong style="color: #ffffff; font-family: monospace; font-size: 16px;">${item.twoFactorCode}</strong></div>`;
          
          contentHtml += `</div></div>`;
        }
      } else {
        let defaultLayout = `
          <div style="background-color: #09090b; border: 1px solid #18181b; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 20px 0; font-size: 13px; color: #ef4444; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Account Credentials</p>
            
            <div style="display: flex; flex-direction: column; gap: 16px;">
              ${item.email ? `
              <div>
                <span style="font-size: 12px; color: #71717a; display: block; margin-bottom: 6px; font-weight: 600;">Sign-in ID (Email)</span>
                <div style="background-color: #000; padding: 14px; border-radius: 12px; border: 1px solid #27272a; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 15px; color: #ffffff; font-weight: 700; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);">${item.email}</div>
              </div>` : ''}
              
              ${item.password ? `
              <div>
                <span style="font-size: 12px; color: #71717a; display: block; margin-bottom: 6px; font-weight: 600;">Password</span>
                <div style="background-color: #000; padding: 14px; border-radius: 12px; border: 1px solid #27272a; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 15px; color: #ffffff; font-weight: 700; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);">${item.password}</div>
              </div>` : ''}
            </div>
          </div>
        `;

        if (selectedSlotCode || item.code) {
          const displayCode = selectedSlotCode || item.code;
          defaultLayout += `
            <div style="background: linear-gradient(135deg, #18181b 0%, #09090b 100%); border: 2px solid #dc2626; border-radius: 20px; padding: 28px; margin-bottom: 24px; text-align: center; box-shadow: 0 10px 30px rgba(220, 38, 38, 0.2);">
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #ffffff; text-transform: uppercase; font-weight: 800; letter-spacing: 2px;">Your Activation Code</p>
              <div style="display: inline-block; background-color: #000; padding: 16px 32px; border-radius: 12px; border: 1px solid #450a0a;">
                <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 26px; font-weight: 900; letter-spacing: 4px; color: #ef4444;">${displayCode}</span>
              </div>
            </div>
          `;
        }

        if (item.outlookEmail || item.birthdate || item.twoFactorCode) {
          defaultLayout += `<div style="background-color: #09090b; border: 1px solid #18181b; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 16px 0; font-size: 13px; color: #ef4444; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Security & Recovery Details</p>
            <div style="display: grid; gap: 12px; font-size: 14px;">`;
            
          if (item.outlookEmail) defaultLayout += `<div style="padding: 8px 0; border-bottom: 1px solid #18181b;"><span style="color: #71717a;">Recovery Email:</span> <strong style="color: #ffffff; margin-left: 8px;">${item.outlookEmail}</strong></div>`;
          if (item.outlookPassword) defaultLayout += `<div style="padding: 8px 0; border-bottom: 1px solid #18181b;"><span style="color: #71717a;">Recovery Password:</span> <strong style="color: #ffffff; margin-left: 8px;">${item.outlookPassword}</strong></div>`;
          if (item.birthdate) defaultLayout += `<div style="padding: 8px 0; border-bottom: 1px solid #18181b;"><span style="color: #71717a;">Birthdate:</span> <strong style="color: #ffffff; margin-left: 8px;">${item.birthdate}</strong></div>`;
          if (item.region) defaultLayout += `<div style="padding: 8px 0; border-bottom: 1px solid #18181b;"><span style="color: #71717a;">Region:</span> <strong style="color: #ffffff; margin-left: 8px;">${item.region}</strong></div>`;
          if (item.twoFactorCode) defaultLayout += `<div style="margin-top: 8px; background: #450a0a; border: 1px solid #991b1b; padding: 12px; border-radius: 8px;"><span style="color: #fecaca; display: block; margin-bottom: 4px; font-size: 12px; font-weight: 700;">2FA Secret Key:</span> <strong style="color: #ffffff; font-family: monospace; font-size: 16px;">${item.twoFactorCode}</strong></div>`;
          
          defaultLayout += `</div></div>`;
        }

        contentHtml = defaultLayout;
      }

      html += contentHtml;

      const rulesToShow = emailRules || (isRulesTemplate ? rulesForGamesBody : '');
      if (rulesToShow) {
        let renderedRules = rulesToShow;
        const placeholders: Record<string, string> = {
          email: item.email || '',
          password: item.password || '',
          code: item.code || selectedSlotCode || '',
          name: order.customer_name || '',
          orderNumber: order.order_number || order.id || '',
          productName: item.name || '',
        };
        Object.keys(placeholders).forEach(key => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          const value = placeholders[key] || '';
          renderedRules = renderedRules.replace(regex, value);
        });

        const formattedRules = renderedRules.includes('<') && renderedRules.includes('>')
          ? renderedRules
          : renderedRules.replace(/\n/g, '<br>');

        html += `
          <div style="background-color: #27272a; border-left: 4px solid #dc2626; border-radius: 0 8px 8px 0; padding: 16px; margin-top: 24px;">
            <p style="margin: 0; font-size: 13px; color: #d4d4d8; line-height: 1.6; white-space: pre-wrap;">${formattedRules}</p>
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
