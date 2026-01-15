-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  full_name VARCHAR(255),
  role VARCHAR(20) CHECK (role IN ('developer', 'creator', 'buyer', 'admin', 'organizer')),
  tier INTEGER CHECK (tier BETWEEN 1 AND 4),
  oauth_provider VARCHAR(50),
  oauth_id VARCHAR(255),
  kyc_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Social accounts
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  handle VARCHAR(255),
  followers INTEGER,
  engagement_rate DECIMAL(5,2),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- KYC documents
CREATE TABLE kyc_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  file_url TEXT NOT NULL,
  verification_status VARCHAR(20) DEFAULT 'pending',
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Properties
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  developer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  listing_type VARCHAR(30) CHECK (listing_type IN ('sale', 'rent', 'lead_generation')),
  property_type VARCHAR(50),
  asking_price DECIMAL(15,2),
  minimum_price DECIMAL(15,2),
  location JSONB,
  visibility VARCHAR(30) CHECK (visibility IN ('all_creators', 'exclusive_creators')),
  verification_status VARCHAR(30) DEFAULT 'draft',
  status VARCHAR(30) DEFAULT 'active',
  lead_price DECIMAL(10,2),
  lead_quota INTEGER,
  leads_generated INTEGER DEFAULT 0,
  campaign_start_date TIMESTAMP,
  campaign_end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_properties_developer ON properties(developer_id);
CREATE INDEX idx_properties_status ON properties(verification_status);
CREATE INDEX idx_properties_listing_type ON properties(listing_type);
CREATE INDEX idx_properties_verification_status ON properties(verification_status);

-- Property documents
CREATE TABLE property_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  file_url TEXT NOT NULL,
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Property media
CREATE TABLE property_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  media_type VARCHAR(20) CHECK (media_type IN ('image', 'video')),
  url TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tracking links
CREATE TABLE tracking_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unique_code VARCHAR(255) UNIQUE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  leads INTEGER DEFAULT 0,
  inspections INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tracking_links_code ON tracking_links(unique_code);
CREATE INDEX idx_tracking_links_creator ON tracking_links(creator_id);
CREATE INDEX idx_tracking_links_property ON tracking_links(property_id);

-- Leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES users(id),
  buyer_name VARCHAR(255) NOT NULL,
  buyer_phone VARCHAR(20) NOT NULL,
  buyer_email VARCHAR(255),
  source_link VARCHAR(255),
  status VARCHAR(30) DEFAULT 'new',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leads_property ON leads(property_id);
CREATE INDEX idx_leads_creator ON leads(creator_id);

-- Inspections
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES users(id),
  slot_time TIMESTAMP NOT NULL,
  status VARCHAR(30) DEFAULT 'booked',
  confirmed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_inspections_property ON inspections(property_id);
CREATE INDEX idx_inspections_buyer ON inspections(buyer_id);
CREATE INDEX idx_inspections_slot_time ON inspections(slot_time);

-- Contracts of sale
CREATE TABLE contracts_of_sale (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  developer_id UUID REFERENCES users(id),
  terms JSONB NOT NULL,
  developer_signature VARCHAR(255),
  developer_signed_at TIMESTAMP,
  developer_ip_address VARCHAR(45),
  reach_signature VARCHAR(255),
  reach_signed_at TIMESTAMP,
  reach_admin_id UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'pending_developer_signature',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Escrow transactions
CREATE TABLE escrow_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id),
  buyer_id UUID REFERENCES users(id),
  developer_id UUID REFERENCES users(id),
  creator_id UUID REFERENCES users(id),
  amount DECIMAL(15,2) NOT NULL,
  splits JSONB NOT NULL,
  status VARCHAR(30) DEFAULT 'held',
  payment_reference VARCHAR(255),
  released_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_escrow_buyer ON escrow_transactions(buyer_id);
CREATE INDEX idx_escrow_developer ON escrow_transactions(developer_id);
CREATE INDEX idx_escrow_status ON escrow_transactions(status);

-- Wallets
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  balance DECIMAL(15,2) DEFAULT 0,
  locked_balance DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Payouts
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  status VARCHAR(30) DEFAULT 'requested',
  bank_account JSONB,
  processed_at TIMESTAMP,
  processed_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Handovers
CREATE TABLE handovers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id),
  transaction_id UUID REFERENCES escrow_transactions(id),
  developer_id UUID REFERENCES users(id),
  buyer_id UUID REFERENCES users(id),
  type VARCHAR(30) CHECK (type IN ('sale', 'long_term_rental', 'short_term_rental')),
  status VARCHAR(50) DEFAULT 'payment_confirmed',
  payment_confirmed_at TIMESTAMP,
  documents_submitted_at TIMESTAMP,
  documents_verified_at TIMESTAMP,
  keys_released_at TIMESTAMP,
  reach_signed_at TIMESTAMP,
  buyer_signed_at TIMESTAMP,
  keys_delivered_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_handovers_property ON handovers(property_id);
CREATE INDEX idx_handovers_buyer ON handovers(buyer_id);

-- Document vault
CREATE TABLE document_vault (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id),
  document_type VARCHAR(50) NOT NULL,
  file_url TEXT NOT NULL,
  signed_at TIMESTAMP,
  watermark_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read);

-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  venue VARCHAR(255),
  date TIMESTAMP NOT NULL,
  capacity INTEGER,
  ticket_price DECIMAL(10,2),
  creator_commission_rate DECIMAL(5,2),
  verification_status VARCHAR(30) DEFAULT 'pending',
  tickets_sold INTEGER DEFAULT 0,
  status VARCHAR(30) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tickets
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES users(id),
  creator_id UUID REFERENCES users(id),
  qr_code TEXT UNIQUE NOT NULL,
  purchase_date TIMESTAMP DEFAULT NOW(),
  validated_at TIMESTAMP,
  status VARCHAR(30) DEFAULT 'active'
);

CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_tickets_buyer ON tickets(buyer_id);
CREATE INDEX idx_tickets_creator ON tickets(creator_id);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Developers can view their properties
CREATE POLICY "Developers can view their properties" ON properties
  FOR SELECT USING (auth.uid() = developer_id OR verification_status = 'verified');

-- Users can view their own leads
CREATE POLICY "Users can view own leads" ON leads
  FOR SELECT USING (
    auth.uid() IN (
      SELECT developer_id FROM properties WHERE id = leads.property_id
    ) OR
    auth.uid() = creator_id
  );

-- Users can view their own wallet
CREATE POLICY "Users can view own wallet" ON wallets
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

