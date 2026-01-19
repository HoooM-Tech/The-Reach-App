-- Create bids table for property bidding
CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES users(id),
  amount DECIMAL(15,2) NOT NULL,
  status VARCHAR(30) DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bids_property ON bids(property_id);
CREATE INDEX idx_bids_buyer ON bids(buyer_id);
CREATE INDEX idx_bids_status ON bids(status);

-- Create property_notes table for developer notes
CREATE TABLE IF NOT EXISTS property_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  developer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_property_notes_property ON property_notes(property_id);
CREATE INDEX idx_property_notes_developer ON property_notes(developer_id);

-- Create property_rejection_feedback table for rejection reasons
CREATE TABLE IF NOT EXISTS property_rejection_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  feedback_message TEXT NOT NULL,
  admin_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_property_rejection_feedback_property ON property_rejection_feedback(property_id);

-- Add missing fields to inspections table
ALTER TABLE inspections 
  ADD COLUMN IF NOT EXISTS type VARCHAR(30) CHECK (type IN ('video_chat', 'in_person')) DEFAULT 'in_person',
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS reminder_days INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS buyer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS buyer_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS buyer_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add contract_url to contracts_of_sale table
ALTER TABLE contracts_of_sale 
  ADD COLUMN IF NOT EXISTS contract_url TEXT;

-- Add missing fields to properties table if needed
ALTER TABLE properties 
  ADD COLUMN IF NOT EXISTS bedrooms INTEGER,
  ADD COLUMN IF NOT EXISTS bathrooms INTEGER,
  ADD COLUMN IF NOT EXISTS sqft DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS rating DECIMAL(3,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
