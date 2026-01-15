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

    const validated = uploadSchema.parse({ type, bucket: bucket || undefined })

    // Upload file
    const fileUrl = await uploadFile(file, validated.type, user.id, validated.bucket || 'property-media')

    return NextResponse.json(
      {
        message: 'File uploaded successfully',
        file_url: fileUrl,
      },
      { status: 201 }
    )
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

