// Test environment variables
require('dotenv').config({ path: '.env.local' });

console.log('Environment Variables Test:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
}

// Test Supabase connection
const { createClient } = require('@supabase/supabase-js');

if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  console.log('Supabase client created successfully');
  
  // Test basic connection
  supabase.from('chat_sessions').select('count').limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.log('Supabase connection error:', error.message);
      } else {
        console.log('Supabase connection successful');
      }
    })
    .catch(err => {
      console.log('Supabase test failed:', err.message);
    });
} else {
  console.log('Cannot test Supabase - missing environment variables');
}