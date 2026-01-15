-- Add INSERT policies for users table
-- Note: Service role (using service_role key) should bypass RLS automatically
-- But we add these policies as a safety measure and for clarity

-- Allow authenticated users to insert their own record during signup
-- This works because auth.uid() will match the id being inserted
CREATE POLICY "Users can insert own record" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow service role to insert users (for admin operations)
-- This policy allows inserts when using service_role key
CREATE POLICY "Allow service role inserts" ON users
  FOR INSERT
  WITH CHECK (true);

-- Add INSERT policies for wallets
CREATE POLICY "Service role can insert wallets" ON wallets
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can insert own wallet" ON wallets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add INSERT policies for other tables that need it
CREATE POLICY "Service role can insert properties" ON properties
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Developers can insert own properties" ON properties
  FOR INSERT
  WITH CHECK (auth.uid() = developer_id);

CREATE POLICY "Service role can insert leads" ON leads
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can insert notifications" ON notifications
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can insert own notifications" ON notifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

