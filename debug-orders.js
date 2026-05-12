// Debug script to check orders and session
console.log('=== DEBUGGING ORDERS AND SESSION ===');

// Check current session
const sessionData = localStorage.getItem('customerSession');
console.log('Session data from localStorage:', sessionData);

if (sessionData) {
  try {
    const session = JSON.parse(sessionData);
    console.log('Parsed session:', session);
    console.log('User email:', session.user?.email);
  } catch (e) {
    console.error('Error parsing session:', e);
  }
} else {
  console.log('No session data found');
}

// Check if user is logged in by checking for auth token
const authToken = localStorage.getItem('authToken');
console.log('Auth token:', authToken);

// Check all localStorage items
console.log('All localStorage items:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  const value = localStorage.getItem(key);
  console.log(`  ${key}:`, value);
}

console.log('=== END DEBUG ===');
