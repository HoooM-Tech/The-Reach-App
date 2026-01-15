export enum InspectionStatus {
  PENDING = 'PENDING',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum InspectionType {
  INITIAL = 'INITIAL',
  FOLLOW_UP = 'FOLLOW_UP',
  FINAL = 'FINAL',
  ROUTINE = 'ROUTINE',
}

export interface Inspection {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  propertyImage?: string;
  type: InspectionType;
  status: InspectionStatus;
  scheduledDate: string; // ISO date string
  scheduledTime: string; // HH:mm format
  inspectorName?: string;
  inspectorContact?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

