const fs = require('fs');
const path = require('path');

const envContent = `# Supabase Configuration
# Get these from: https://supabase.com/dashboard/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcHJvamVjdC1pZCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQ1NzI4MDAwLCJleHAiOjE5NjEzMDQwMDB9.REPLACE_WITH_YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcHJvamVjdC1pZCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2NDU3MjgwMDAsImV4cCI6MTk2MTMwNDAwMH0.REPLACE_WITH_YOUR_SERVICE_ROLE_KEY

# Database Connection (Optional - if using direct PostgreSQL connection)
# Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
DATABASE_URL=postgresql://postgres:YOUR_DATABASE_PASSWORD@db.your-project-id.supabase.co:5432/postgres

# Authentication
# Google OAuth - Get from: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz123456

# NextAuth Configuration
# Generate a random secret: openssl rand -base64 32
NEXTAUTH_SECRET=your-nextauth-secret-key-replace-with-random-32-char-string
NEXTAUTH_URL=http://localhost:3000

# Termii SMS Service
# Get from: https://termii.com/dashboard/api
TERMII_API_KEY=TLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TERMII_SENDER_ID=ReachApp

# Paystack Payment Gateway
# Get from: https://dashboard.paystack.com/#/settings/developer
# Use test keys for development: pk_test_... and sk_test_...
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# File Storage
# Bucket name in Supabase Storage (should match the bucket you created)
SUPABASE_STORAGE_BUCKET=property-media

# Push Notifications (Optional - for future implementation)
# Get from: https://web.dev/push-notifications-overview/
VAPID_PUBLIC_KEY=BGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Redis (Optional - for rate limiting and caching)
# Get from: https://upstash.com/ or your Redis provider
UPSTASH_REDIS_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Document Signing Secret
# Generate a random secret: openssl rand -base64 32
SIGNING_SECRET=your-signing-secret-for-contracts-replace-with-random-32-char-string

# SociaVault API (for social media verification)
# Get from: https://sociavault.com/dashboard/api
SOCIAVAULT_API_KEY=your_sociavault_api_key_here

# Cron Secret (for scheduled tasks)
# Generate a random secret: openssl rand -base64 32
CRON_SECRET=your-cron-secret-for-scheduled-tasks-replace-with-random-32-char-string
`;

const envPath = path.join(process.cwd(), '.env.local');

try {
  // Check if file already exists
  if (fs.existsSync(envPath)) {
    console.log('⚠️  .env.local already exists. Skipping creation.');
    console.log('   If you want to recreate it, delete the existing file first.');
    process.exit(0);
  }

  // Create the file
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✅ Created .env.local file with placeholder values');
  console.log('📝 Please update the values with your actual credentials');
  console.log('   See SETUP.md for instructions on where to get each value');
} catch (error) {
  console.error('❌ Error creating .env.local:', error.message);
  process.exit(1);
}

