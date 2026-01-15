import { createAdminSupabaseClient } from '@/lib/supabase/client'

const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  document: ['application/pdf'],
  video: ['video/mp4', 'video/quicktime'],
}

const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  video: 50 * 1024 * 1024, // 50MB
}

export async function uploadFile(
  file: File,
  type: 'image' | 'document' | 'video',
  userId: string,
  bucket: string = 'property-media'
): Promise<string> {
  // Validate file type by MIME type
  if (!ALLOWED_FILE_TYPES[type].includes(file.type)) {
    throw new Error(`Invalid file type. Allowed: ${ALLOWED_FILE_TYPES[type].join(', ')}`)
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZES[type]) {
    throw new Error(`File too large. Max size: ${MAX_FILE_SIZES[type] / 1024 / 1024}MB`)
  }

  // Additional security: Validate file extension matches MIME type
  const fileName = file.name.toLowerCase()
  const extension = fileName.substring(fileName.lastIndexOf('.'))
  
  const allowedExtensions: Record<string, string[]> = {
    image: ['.jpg', '.jpeg', '.png', '.webp'],
    document: ['.pdf'],
    video: ['.mp4', '.mov'],
  }
  
  if (!allowedExtensions[type].includes(extension)) {
    throw new Error(`File extension ${extension} does not match file type ${type}`)
  }

  // Validate minimum file size (prevent empty files)
  if (file.size === 0) {
    throw new Error('File is empty')
  }

  const supabase = createAdminSupabaseClient()

  const filename = `${userId}/${Date.now()}-${file.name}`

  const { error } = await supabase.storage.from(bucket).upload(filename, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filename)

  return publicUrl
}

