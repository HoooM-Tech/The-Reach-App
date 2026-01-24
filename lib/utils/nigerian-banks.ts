/**
 * Comprehensive list of Nigerian banks, digital banks, and fintech providers
 * Sorted alphabetically with popular banks marked
 */

export interface NigerianBank {
  name: string;
  code: string;
  category: 'traditional' | 'digital' | 'microfinance' | 'fintech';
  popular?: boolean;
}

export const NIGERIAN_BANKS: NigerianBank[] = [
  // Popular Fintech & Digital Banks (shown first)
  { name: 'OPay', code: '999992', category: 'fintech', popular: true },
  { name: 'PalmPay', code: '999991', category: 'fintech', popular: true },
  { name: 'Moniepoint Microfinance Bank', code: '50515', category: 'fintech', popular: true },
  { name: 'Kuda Bank', code: '50211', category: 'digital', popular: true },
  { name: 'ALAT by WEMA', code: '035', category: 'digital', popular: true }, // Uses Wema Bank code
  
  // Traditional Banks (A-Z)
  { name: 'Access Bank', code: '044', category: 'traditional' },
  { name: 'Access Bank (Diamond)', code: '063', category: 'traditional' },
  { name: 'Citibank Nigeria', code: '023', category: 'traditional' },
  { name: 'Ecobank Nigeria', code: '050', category: 'traditional' },
  { name: 'Fidelity Bank', code: '070', category: 'traditional' },
  { name: 'First Bank of Nigeria', code: '011', category: 'traditional' },
  { name: 'First City Monument Bank (FCMB)', code: '214', category: 'traditional' },
  { name: 'Globus Bank', code: '00103', category: 'traditional' },
  { name: 'Guaranty Trust Bank (GTBank)', code: '058', category: 'traditional' },
  { name: 'Heritage Bank', code: '030', category: 'traditional' },
  { name: 'Keystone Bank', code: '082', category: 'traditional' },
  { name: 'Parallex Bank', code: '526', category: 'traditional' },
  { name: 'Polaris Bank', code: '076', category: 'traditional' },
  { name: 'Providus Bank', code: '101', category: 'traditional' },
  { name: 'Stanbic IBTC Bank', code: '221', category: 'traditional' },
  { name: 'Standard Chartered Bank', code: '068', category: 'traditional' },
  { name: 'Sterling Bank', code: '232', category: 'traditional' },
  { name: 'SunTrust Bank', code: '100', category: 'traditional' },
  { name: 'Titan Trust Bank', code: '102', category: 'traditional' },
  { name: 'Union Bank of Nigeria', code: '032', category: 'traditional' },
  { name: 'United Bank For Africa (UBA)', code: '033', category: 'traditional' },
  { name: 'Unity Bank', code: '215', category: 'traditional' },
  { name: 'Wema Bank', code: '035', category: 'traditional' },
  { name: 'Zenith Bank', code: '057', category: 'traditional' },
  
  // Digital Banks
  { name: 'Sparkle Microfinance Bank', code: '51310', category: 'digital' },
  { name: 'VFD Microfinance Bank', code: '566', category: 'digital' },
  
  // Microfinance & Specialized Banks
  { name: 'ASO Savings and Loans', code: '401', category: 'microfinance' },
  { name: 'Jaiz Bank', code: '301', category: 'microfinance' },
  { name: 'Lotus Bank', code: '303', category: 'microfinance' },
  { name: 'Rubies Microfinance Bank', code: '125', category: 'microfinance' },
  { name: 'Eyowo', code: '50126', category: 'microfinance' },
  { name: 'GoMoney', code: '100022', category: 'microfinance' },
  { name: 'Carbon', code: '565', category: 'microfinance' },
  { name: 'FairMoney Microfinance Bank', code: '51318', category: 'microfinance' },
  { name: 'Renmoney Microfinance Bank', code: '50767', category: 'microfinance' },
  { name: 'Paycom (OPay)', code: '999992', category: 'fintech' },
];

/**
 * Get banks grouped by category
 */
export function getBanksByCategory() {
  const popular = NIGERIAN_BANKS.filter(b => b.popular);
  const traditional = NIGERIAN_BANKS.filter(b => b.category === 'traditional' && !b.popular);
  const digital = NIGERIAN_BANKS.filter(b => b.category === 'digital' && !b.popular);
  const fintech = NIGERIAN_BANKS.filter(b => b.category === 'fintech' && !b.popular);
  const microfinance = NIGERIAN_BANKS.filter(b => b.category === 'microfinance' && !b.popular);
  
  return {
    popular,
    traditional,
    digital,
    fintech,
    microfinance,
  };
}

/**
 * Search banks by name
 */
export function searchBanks(query: string): NigerianBank[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return NIGERIAN_BANKS;
  
  return NIGERIAN_BANKS.filter(bank =>
    bank.name.toLowerCase().includes(lowerQuery) ||
    bank.code.includes(lowerQuery)
  );
}
