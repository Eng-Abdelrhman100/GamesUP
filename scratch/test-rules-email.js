// Simulating the emailService call
import dotenv from 'dotenv';
dotenv.config();

async function testRulesEmail() {
  const url = 'http://localhost:3001/api/send-email';
  
  const product = {
    name: 'Ghost of Tsushima',
    sendEmailEnabled: true,
    emailTemplate: 'rules_for_games'
  };

  const order = {
    customer_name: 'Test Customer',
    customer_email: 'info@games-up.co',
    order_number: 'TEST-123'
  };

  const digitalItem = {
    email: 'player@example.com',
    password: 'securepass123',
    code: 'GHOST-CODE-99'
  };

  // Mocking the logic in emailService.ts
  let subject = 'Important Rules for Your Game';
  let body = '<h1>Game Rules</h1><p>Hello {{name}},</p><p>Please follow the safety guidelines for {{productName}}.</p><p>Account: {{email}}<br>Password: {{password}}<br>Code: {{code}}</p>';

  const placeholders = {
    email: digitalItem.email,
    password: digitalItem.password,
    code: digitalItem.code,
    name: order.customer_name,
    orderNumber: order.order_number,
    productName: product.name,
  };

  Object.keys(placeholders).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    const value = placeholders[key] || '';
    subject = subject.replace(regex, value);
    body = body.replace(regex, value);
  });

  const payload = {
    to: order.customer_email,
    subject: subject,
    html: body
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('Rules Email Test Result:', result);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testRulesEmail();
