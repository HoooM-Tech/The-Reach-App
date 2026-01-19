import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { uploadFile } from '@/lib/utils/file-upload'
import { ValidationError, handleError } from '@/lib/utils/errors'
import { z } from 'zod'

const uploadSchema = z.object({
  type: z.enum(['image', 'document', 'video']),
  bucket: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const formData = await req.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string
    const bucket = formData.get('bucket') as string | null

    if (!file) {
      throw new ValidationError('No file provided')
    }

    if (!type) {
      throw new ValidationError('File type is required')
    }

    const validated = uploadSchema.parse({ type, bucket: bucket || undefined })

    // Upload file - use property-media bucket if bucket not specified (for backward compatibility)
    // For profile pictures, use 'avatars' bucket (more common) or create 'profile-pictures' in Supabase
    const targetBucket = validated.bucket || 'property-media'
    
    try {
      const fileUrl = await uploadFile(file, validated.type, user.id, targetBucket)
      
      return NextResponse.json(
        {
          message: 'File uploaded successfully',
          file_url: fileUrl,
        },
        { status: 201 }
      )
    } catch (uploadError: any) {
      // If bucket doesn't exist, provide helpful error message
      if (uploadError?.message?.includes('Bucket') || uploadError?.message?.includes('not found')) {
        throw new ValidationError(
          `Storage bucket '${targetBucket}' does not exist. Please create it in Supabase Storage first, or use an existing bucket like 'avatars' or 'property-media'.`
        )
      }
      throw uploadError
    }
  } catch (error) {
    console.error('[Upload API] Error:', error)
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

