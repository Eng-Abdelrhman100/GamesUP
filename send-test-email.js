const API_URL = 'http://localhost:5174/api/send-email';
const TEST_RECIPIENT = 'nexlancer.eg@gmail.com';

async function sendTestEmail() {
  console.log(`🚀 Sending test order emails to ${TEST_RECIPIENT}...\n`);

  // 1. Order Confirmation Template
  const orderConfirmation = {
    to: TEST_RECIPIENT,
    subject: 'Order Confirmation #GS-99283',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #ff1574;">GamesUp - Order Received!</h2>
        <p>Hello NexLancer,</p>
        <p>Thank you for your order <strong>#GS-99283</strong>!</p>
        <p><strong>Total:</strong> $59.99</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p>Your order is currently being processed. You will receive another email with your digital items once it is completed.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #888;">This is a test email from the GamesUp Platform migration check.</p>
      </div>
    `
  };

  // 2. Digital Delivery Template
  const digitalDelivery = {
    to: TEST_RECIPIENT,
    subject: 'Your Digital Items for Order #GS-99283',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #ff1574;">GamesUp - Your Digital Delivery</h2>
        <p>Hello NexLancer,</p>
        <p>Your order <strong>#GS-99283</strong> is complete! Here are your digital items:</p>
        
        <div style="margin-bottom: 25px; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; background-color: #f8fafc;">
          <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">FC 25 - Ultimate Edition</h3>
          <div style="font-size: 14px; color: #334155; line-height: 1.6;">
            <div><strong>Account Email:</strong> test-user@gamesup.store</div>
            <div><strong>Account Password:</strong> SecurePass123!</div>
            <div style="margin-top: 10px; padding: 12px; background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px;">
               <strong style="color: #dc2626; font-size: 14px;">Selected Option (Primary PS5):</strong>
               <span style="font-family: monospace; font-size: 15px; font-weight: bold; margin-left: 8px; letter-spacing: 1px; color: #b91c1c;">ABCD-1234-EFGH-5678</span>
            </div>
          </div>
        </div>

        <p>Thank you for shopping with us!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #888;">This is a test email from the GamesUp Platform migration check.</p>
      </div>
    `
  };

  try {
    console.log('--- Sending Order Confirmation ---');
    const res1 = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderConfirmation)
    });
    const result1 = await res1.json();
    console.log('Result:', result1);

    console.log('\n--- Sending Digital Delivery ---');
    const res2 = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(digitalDelivery)
    });
    const result2 = await res2.json();
    console.log('Result:', result2);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

sendTestEmail();
