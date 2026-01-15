import { create } from 'zustand';
import { Property, PropertyStatus, ListingType } from '../types/property';

interface PropertyStore {
  properties: Property[];
  setProperties: (properties: Property[]) => void;
  addProperty: (property: Property) => void;
  updateProperty: (id: string, updates: Partial<Property>) => void;
  deleteProperty: (id: string) => void;
  getPropertyById: (id: string) => Property | undefined;
  getPropertiesByDeveloper: (developerId: string) => Property[];
  getVerifiedProperties: () => Property[];
  getAdminQueue: () => Property[];
}

// Seeded sample data
const seedProperties: Property[] = [
  {
    id: 'prop-1',
    developerId: 'dev-1',
    title: '4 Bedroom duplex Apartment',
    description: 'Modern duplex in the heart of Lekki.',
    listingType: ListingType.SALE,
    visibility: 'ALL_CREATORS' as any,
    askingPrice: 20000000,
    minAcceptablePrice: 18000000,
    currency: 'NGN',
    locationText: '222A Freedom way, Lekki Phase 1, Lagos',
    city: 'Lagos',
    state: 'Lagos',
    country: 'Nigeria',
    bedrooms: 4,
    bathrooms: 3,
    status: PropertyStatus.VERIFIED,
    media: [
      { id: 'media-1', type: 'IMAGE', url: 'https://picsum.photos/600/400?random=101', sortOrder: 0 }
    ],
    documents: [
      { id: 'doc-1', docType: 'TITLE_DOC', name: 'title-deed.pdf' },
      { id: 'doc-2', docType: 'SURVEY_PLAN', name: 'survey-plan.pdf' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prop-2',
    developerId: 'dev-1',
    title: 'Minimalist Modern Flat',
    description: 'Luxury at its finest.',
    listingType: ListingType.SALE,
    visibility: 'ALL_CREATORS' as any,
    askingPrice: 45000000,
    currency: 'NGN',
    locationText: 'Banana Island, Ikoyi, Lagos',
    city: 'Lagos',
    state: 'Lagos',
    country: 'Nigeria',
    bedrooms: 3,
    bathrooms: 2,
    status: PropertyStatus.REJECTED,
    rejectionReason: 'One or more details didn\'t meet our listing requirement, please review the feedback and resubmit',
    media: [
      { id: 'media-2', type: 'IMAGE', url: 'https://picsum.photos/600/400?random=102', sortOrder: 0 }
    ],
    documents: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prop-3',
    developerId: 'dev-1',
    title: 'Studio Loft',
    description: 'Perfect for young professionals.',
    listingType: ListingType.RENT,
    visibility: 'ALL_CREATORS' as any,
    askingPrice: 15000000,
    currency: 'NGN',
    locationText: 'Victoria Island, Lagos',
    city: 'Lagos',
    state: 'Lagos',
    country: 'Nigeria',
    bedrooms: 1,
    bathrooms: 1,
    status: PropertyStatus.PENDING_VERIFICATION,
    media: [
      { id: 'media-3', type: 'IMAGE', url: 'https://picsum.photos/600/400?random=103', sortOrder: 0 }
    ],
    documents: [
      { id: 'doc-3', docType: 'PROOF_OF_OWNERSHIP', name: 'ownership-proof.pdf' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prop-4',
    developerId: 'dev-1',
    title: 'Luxury Penthouse',
    description: 'Stunning views of the city.',
    listingType: ListingType.SALE,
    visibility: 'EXCLUSIVE_CREATORS' as any,
    askingPrice: 80000000,
    currency: 'NGN',
    locationText: 'Eko Atlantic, Lagos',
    city: 'Lagos',
    state: 'Lagos',
    country: 'Nigeria',
    bedrooms: 5,
    bathrooms: 4,
    status: PropertyStatus.DRAFT,
    media: [],
    documents: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Simple localStorage persistence helper
const STORAGE_KEY = 'property-storage';

const loadFromStorage = (): Property[] => {
  if (typeof window === 'undefined') return seedProperties;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.properties || seedProperties;
    }
  } catch {
    // Ignore errors
  }
  return seedProperties;
};

const saveToStorage = (properties: Property[]) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ properties }));
    } catch {
      // Ignore errors
    }
  }
};

export const usePropertyStore = create<PropertyStore>()((set, get) => ({
  properties: loadFromStorage(),
  
  setProperties: (properties) => {
    set({ properties });
    saveToStorage(properties);
  },
  
  addProperty: (property) => {
    const newProperties = [...get().properties, property];
    set({ properties: newProperties });
    saveToStorage(newProperties);
  },
  
  updateProperty: (id, updates) => {
    const updated = get().properties.map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
    );
    set({ properties: updated });
    saveToStorage(updated);
  },
  
  deleteProperty: (id) => {
    const filtered = get().properties.filter((p) => p.id !== id);
    set({ properties: filtered });
    saveToStorage(filtered);
  },
  
  getPropertyById: (id) => {
    return get().properties.find((p) => p.id === id);
  },
  
  getPropertiesByDeveloper: (developerId) => {
    return get().properties.filter((p) => p.developerId === developerId);
  },
  
  getVerifiedProperties: () => {
    return get().properties.filter((p) => p.status === PropertyStatus.VERIFIED);
  },
  
  getAdminQueue: () => {
    return get().properties.filter(
      (p) => p.status === PropertyStatus.SUBMITTED || p.status === PropertyStatus.PENDING_VERIFICATION
    );
  }
}));

