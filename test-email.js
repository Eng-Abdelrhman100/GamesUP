import dotenv from 'dotenv';
dotenv.config();

const API_URL = 'http://localhost:3001/api/send-email';

async function testEmail() {
  console.log('🧪 Testing Email Service via Local Server...\n');

  const testEmail = 'ibrahim.talat18@gmail.com';

  const testProduct = {
    name: 'PlayStation 5 Console',
    emailTemplate: `🎮 Your Digital Product Details 🎮

Hello Ibrahim!

Thank you for your order #TEST-001!

📦 Product: PlayStation 5 Console

🔐 Your Account Credentials:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email: test@gamesup.com
🔑 Password: SecurePass123!
🎴 Code: PS5-2024-ABCD-1234
━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Important: Please change your password immediately after login.

Best regards,
Games Up Team 🎮`
  };

  console.log('📧 Sending to:', testEmail);
  console.log('');

  try {
    const subject = `Order Confirmation - ${testProduct.name}`;
    const body = testProduct.emailTemplate;

    console.log('📬 Connecting to:', API_URL);
    console.log('');

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: testEmail,
        subject: subject,
        html: body.replace(/\n/g, '<br>')
      })
    });

    const result = await response.json();

    console.log('📊 Response status:', response.status);
    console.log('📊 Response:', JSON.stringify(result, null, 2));

    if (response.ok && result.success) {
      console.log('\n✅ SUCCESS! Email sent!');
      console.log('📧 Message ID:', result.messageId);
    } else {
      console.log('\n❌ FAILED:', result.error || 'Unknown error');
    }
  } catch (error) {
    console.log('\n❌ ERROR:', error.message);
  }
}

testEmail();
