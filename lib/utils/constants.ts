export const CREATOR_COMMISSION_RATE = 0.15 // 15%
export const REACH_PLATFORM_FEE = 0.05 // 5%
export const DEVELOPER_PAYOUT_RATE = 0.80 // 80%

export const MINIMUM_WITHDRAWAL_AMOUNT = 5000 // ₦5,000

export const HANDOVER_TIMELINES = {
  sale: { max_days: 7, developer_to_reach: 2, reach_to_buyer: 5 },
  long_term_rental: { max_days: 7 },
  short_term_rental: { max_days: 3 },
}

export const INSPECTION_SLOT_DURATION = 15 // minutes
export const INSPECTION_HOURS = {
  start: 9,
  end: 17,
}

export const CREATOR_TIER_THRESHOLDS = {
  tier4: { followers: 1000000, engagement: 5 }, // Celebrity
  tier3: { followers: 100000, engagement: 3 }, // Macro-influencer
  tier2: { followers: 10000, engagement: 2 }, // Micro-influencer
  tier1: { followers: 0, engagement: 0 }, // Default
}

export const LEAD_GENERATION_CAMPAIGN_DURATION = 7 // days

export const PROPERTY_DOCUMENTS_REQUIRED = {
  sale: [
    'deed_of_assignment',
    'letter_of_allocation',
    'survey_plan',
    'building_approval',
    'receipts_or_title_docs',
  ],
  long_term_rental: [
    'tenancy_agreement',
    'house_rules',
    'inventory_list',
  ],
  short_term_rental: [
    'booking_confirmation',
    'house_rules',
    'inventory_checklist',
    'checkin_checkout_terms',
  ],
}

