async function testEmail() {
  const url = 'http://localhost:3001/api/send-email';
  const payload = {
    to: 'info@games-up.co', // Sending to self for test
    subject: 'SMTP Test from GamesUp Platform',
    html: '<h1>Success!</h1><p>The SMTP server is working correctly.</p>'
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('Response:', result);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testEmail();
