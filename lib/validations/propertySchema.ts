import { z } from 'zod';
import { ListingType, Visibility } from '../../types/property';

export const propertyFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().optional(),
  listingType: z.nativeEnum(ListingType),
  visibility: z.nativeEnum(Visibility),
  askingPrice: z.number().positive('Asking price must be positive').optional(),
  minAcceptablePrice: z.number().positive('Min acceptable price must be positive').optional(),
  currency: z.enum(['NGN', 'CAD', 'USD']).default('NGN'),
  locationText: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default('Nigeria'),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
}).refine((data) => {
  // If askingPrice is provided, minAcceptablePrice should be less than or equal to askingPrice
  if (data.askingPrice && data.minAcceptablePrice) {
    return data.minAcceptablePrice <= data.askingPrice;
  }
  return true;
}, {
  message: 'Min acceptable price must be less than or equal to asking price',
  path: ['minAcceptablePrice'],
});

export type PropertyFormData = z.infer<typeof propertyFormSchema>;

