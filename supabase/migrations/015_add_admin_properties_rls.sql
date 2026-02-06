-- Add admin RLS policies for properties table
-- This ensures admins can view and manage all properties even when using regular Supabase client

-- Admin can view all properties
CREATE POLICY "Admins can view all properties" ON properties
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admin can update all properties
CREATE POLICY "Admins can update all properties" ON properties
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admin can delete properties (if needed)
CREATE POLICY "Admins can delete properties" ON properties
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
