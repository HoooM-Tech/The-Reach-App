export enum ListingType {
  SALE = 'SALE',
  RENT = 'RENT',
  LEAD_GEN = 'LEAD_GEN'
}

export enum Visibility {
  ALL_CREATORS = 'ALL_CREATORS',
  EXCLUSIVE_CREATORS = 'EXCLUSIVE_CREATORS'
}

export enum PropertyStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED'
}

export type DocType = 
  | 'TITLE_DOC'
  | 'SURVEY_PLAN'
  | 'BUILDING_APPROVAL'
  | 'PROOF_OF_OWNERSHIP'
  | 'TENANCY_CLEARANCE'
  | 'OTHER';

export interface PropertyMedia {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  sortOrder: number;
}

export interface PropertyDocument {
  id: string;
  docType: DocType;
  name: string;
}

export interface Property {
  id: string;
  developerId: string;
  title: string;
  description?: string;
  listingType: ListingType;
  visibility: Visibility;
  askingPrice?: number;
  minAcceptablePrice?: number;
  currency?: 'NGN' | 'CAD' | 'USD';
  locationText?: string;
  city?: string;
  state?: string;
  country?: string;
  bedrooms?: number;
  bathrooms?: number;
  status: PropertyStatus;
  rejectionReason?: string;
  media: PropertyMedia[];
  documents: PropertyDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface PropertyFilters {
  q?: string;
  listingType?: ListingType;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  city?: string;
  state?: string;
}

