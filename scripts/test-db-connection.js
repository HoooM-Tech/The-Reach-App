const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  console.log('🔍 Testing Supabase Database Connection...\n');

  // Check environment variables
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL',
  ];

  console.log('📋 Checking Environment Variables:');
  let allPresent = true;
  requiredVars.forEach((varName) => {
    const value = process.env[varName];
    if (value) {
      const displayValue = varName.includes('KEY') || varName === 'DATABASE_URL'
        ? `${value.substring(0, 20)}...` 
        : value;
      console.log(`  ✅ ${varName}: ${displayValue}`);
    } else {
      console.log(`  ❌ ${varName}: MISSING`);
      allPresent = false;
    }
  });

  if (!allPresent) {
    console.log('\n❌ Missing required environment variables!');
    process.exit(1);
  }

  console.log('\n🔌 Testing Supabase Connection:');

  try {
    // Test with anon key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Test connection by querying a simple table
    console.log('  Testing connection with anon key...');
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      // If users table doesn't exist, that's okay - it means migration hasn't run
      if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log('  ⚠️  Connection successful, but database tables not found.');
        console.log('  💡 Run the migration: supabase/migrations/001_initial_schema.sql');
      } else {
        throw error;
      }
    } else {
      console.log('  ✅ Connection successful! Database is accessible.');
    }

    // Test with service role key
    console.log('\n  Testing connection with service role key...');
    const supabaseAdmin = createClient(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('users')
      .select('count')
      .limit(1);

    if (adminError) {
      if (adminError.code === 'PGRST116' || adminError.message.includes('relation') || adminError.message.includes('does not exist')) {
        console.log('  ⚠️  Service role connection successful, but tables not found.');
      } else {
        throw adminError;
      }
    } else {
      console.log('  ✅ Service role connection successful!');
    }

    // Test storage bucket
    console.log('\n📦 Testing Storage Bucket:');
    const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'property-media';
    const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets();

    if (bucketError) {
      console.log(`  ⚠️  Could not list buckets: ${bucketError.message}`);
    } else {
      const bucketExists = buckets?.some((b) => b.name === bucketName);
      if (bucketExists) {
        console.log(`  ✅ Storage bucket '${bucketName}' exists`);
      } else {
        console.log(`  ⚠️  Storage bucket '${bucketName}' not found`);
        console.log(`  💡 Create it in Supabase Dashboard → Storage`);
      }
    }

    console.log('\n✅ Database connection test completed!');
    console.log('\n📝 Next Steps:');
    console.log('  1. If tables are missing, run: supabase/migrations/001_initial_schema.sql');
    console.log('  2. If storage bucket is missing, create it in Supabase Dashboard');
    console.log('  3. Test your API endpoints with: npm run dev');

  } catch (error) {
    console.error('\n❌ Connection Error:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('  1. Verify your Supabase URL is correct');
    console.error('  2. Check that your API keys are valid');
    console.error('  3. Ensure your Supabase project is active');
    console.error('  4. Check your network connection');
    process.exit(1);
  }
}

testConnection();

