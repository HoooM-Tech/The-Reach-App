-- Fix inspection slots visibility for public users
-- Enable RLS on inspections table and add policies for public slot viewing

-- Enable RLS on inspections table
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

-- Allow public users to SELECT inspections for slot availability checking
-- This is needed for the available-slots API to work for unauthenticated users
CREATE POLICY "Public can view inspections for slot availability" ON inspections
  FOR SELECT
  USING (
    -- Allow viewing inspections to check slot availability
    -- Only show booked/confirmed inspections (not cancelled)
    status IN ('booked', 'confirmed')
  );

-- Allow authenticated users to view their own inspections
CREATE POLICY "Users can view own inspections" ON inspections
  FOR SELECT
  USING (
    buyer_id = auth.uid() OR
    lead_id IN (
      SELECT id FROM leads WHERE buyer_id = auth.uid()
    ) OR
    property_id IN (
      SELECT id FROM properties WHERE developer_id = auth.uid()
    )
  );

-- Allow service role to insert inspections (for booking API)
CREATE POLICY "Service role can insert inspections" ON inspections
  FOR INSERT
  WITH CHECK (true);

-- Allow authenticated users to insert their own inspections
CREATE POLICY "Users can insert own inspections" ON inspections
  FOR INSERT
  WITH CHECK (
    buyer_id = auth.uid() OR
    lead_id IN (
      SELECT id FROM leads WHERE buyer_id = auth.uid() OR creator_id = auth.uid()
    )
  );

-- Allow service role to update inspections
CREATE POLICY "Service role can update inspections" ON inspections
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow developers to update their property inspections
CREATE POLICY "Developers can update property inspections" ON inspections
  FOR UPDATE
  USING (
    property_id IN (
      SELECT id FROM properties WHERE developer_id = auth.uid()
    )
  )
  WITH CHECK (
    property_id IN (
      SELECT id FROM properties WHERE developer_id = auth.uid()
    )
  );
