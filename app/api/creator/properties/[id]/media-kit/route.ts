import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/client';
import { requireCreator } from '@/lib/utils/auth';
import { handleError, NotFoundError, ValidationError } from '@/lib/utils/errors';
import archiver from 'archiver';

/**
 * POST /api/creator/properties/[id]/media-kit
 * 
 * Generates and downloads a media kit ZIP file for a property
 * Only accessible to creators who have an active promotion for this property
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const creator = await requireCreator();
    const { id: propertyId } = await Promise.resolve(params);
    const supabase = createAdminSupabaseClient();

    console.log('[Media Kit] Request received:', {
      propertyId,
      creatorId: creator.id,
      creatorRole: creator.role,
    });

    // Verify creator has access to this property (has an active tracking link)
    // Check if status column exists, if not, query without it
    let trackingLink: any = null;
    let linkError: any = null;

    // First try with status filter
    const { data: linkWithStatus, error: statusError } = await supabase
      .from('tracking_links')
      .select('id, unique_code, status, property_id')
      .eq('property_id', propertyId)
      .eq('creator_id', creator.id)
      .in('status', ['active', 'paused'])
      .maybeSingle();

    if (statusError) {
      // If error is about missing status column, try without it
      if (statusError.message?.includes('column') && statusError.message?.includes('status')) {
        console.log('[Media Kit] Status column not found, querying without status filter');
        const { data: linkWithoutStatus, error: noStatusError } = await supabase
          .from('tracking_links')
          .select('id, unique_code, property_id')
          .eq('property_id', propertyId)
          .eq('creator_id', creator.id)
          .maybeSingle();
        
        if (noStatusError || !linkWithoutStatus) {
          linkError = noStatusError;
        } else {
          trackingLink = linkWithoutStatus;
        }
      } else {
        linkError = statusError;
      }
    } else {
      trackingLink = linkWithStatus;
    }

    if (linkError || !trackingLink) {
      console.error('[Media Kit] Access denied:', {
        propertyId,
        creatorId: creator.id,
        linkError: linkError?.message,
        hasTrackingLink: !!trackingLink,
      });
      throw new NotFoundError(
        'Property not found or you do not have access. You must have an active promotion for this property.'
      );
    }

    // Fetch property details
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, title, verification_status')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      console.error('[Media Kit] Property not found:', {
        propertyId,
        error: propertyError?.message,
      });
      throw new NotFoundError('Property');
    }

    // Only allow download for verified properties
    if (property.verification_status !== 'verified') {
      console.warn('[Media Kit] Property not verified:', {
        propertyId,
        verification_status: property.verification_status,
      });
      throw new ValidationError('Media kit is only available for verified properties.');
    }

    // Fetch all property media
    const { data: media, error: mediaError } = await supabase
      .from('property_media')
      .select('id, media_type, url, order_index')
      .eq('property_id', propertyId)
      .order('order_index', { ascending: true });

    if (mediaError) {
      console.error('[Media Kit] Failed to fetch media:', {
        propertyId,
        error: mediaError.message,
      });
      // If error is about missing column or table, continue with empty media
      if (mediaError.message?.includes('column') || mediaError.message?.includes('relation') || mediaError.message?.includes('does not exist')) {
        console.warn('[Media Kit] Media table/column issue, proceeding with empty media');
        // Continue with empty media array
      } else {
        throw new ValidationError(`Failed to fetch media: ${mediaError.message}`);
      }
    }

    // Separate images and videos
    const images = (media || []).filter((m) => m.media_type === 'image');
    const videos = (media || []).filter((m) => m.media_type === 'video');

    // Allow download even if no media - will create ZIP with just README
    if (images.length === 0 && videos.length === 0) {
      console.warn('[Media Kit] No media files found, creating ZIP with README only:', {
        propertyId,
        totalMedia: media?.length || 0,
      });
      // Continue - will create a ZIP with just the README file
    }

    console.log('[Media Kit] Generating ZIP:', {
      propertyId,
      imagesCount: images.length,
      videosCount: videos.length,
    });

    // Build tracking link URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const trackingLinkUrl = `${baseUrl}/property/${propertyId}?ref=${trackingLink.unique_code}`;

    // Generate README.txt content
    const hasMedia = images.length > 0 || videos.length > 0;
    const readmeContent = `REACH PROPERTY MEDIA KIT
========================

Property Information:
- Title: ${property.title}
- Property ID: ${property.id}
- Creator Tracking Link: ${trackingLinkUrl}

Usage Instructions:
- Use these assets with your Reach tracking link above
- All images and videos are approved for promotional use
- Include your tracking link (${trackingLinkUrl}) when sharing these assets

Media Contents:
- Images: ${images.length} file(s)
- Videos: ${videos.length} file(s)
${!hasMedia ? '\nNote: No media files are currently available for this property. Please contact the developer to add property images and videos.' : ''}

Generated: ${new Date().toISOString()}
`;

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    // Create a readable stream from the archive
    const stream = new ReadableStream({
      async start(controller) {
        archive.on('data', (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });

        archive.on('end', () => {
          controller.close();
        });

        archive.on('error', (err: Error) => {
          controller.error(err);
        });

        // Helper function to download and add file to ZIP
        const addFileToZip = async (url: string, filename: string, folder: string) => {
          try {
            // Check if URL is from Supabase Storage
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            if (!supabaseUrl || !url.includes(supabaseUrl)) {
              // External URL - fetch directly
              const response = await fetch(url);
              if (!response.ok) {
                console.warn(`Failed to fetch ${url}: ${response.statusText}`);
                return;
              }
              const buffer = Buffer.from(await response.arrayBuffer());
              archive.append(buffer, { name: `${folder}/${filename}` });
            } else {
              // Supabase Storage URL - extract bucket and path
              const urlPath = new URL(url).pathname;
              const pathMatch = urlPath.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
              
              if (pathMatch) {
                const [, bucket, filePath] = pathMatch;
                // Download from Supabase Storage using admin client
                const { data, error } = await supabase.storage
                  .from(bucket)
                  .download(filePath);

                if (error) {
                  console.warn(`Failed to download ${filePath} from ${bucket}: ${error.message}`);
                  return;
                }

                if (data) {
                  const arrayBuffer = await data.arrayBuffer();
                  const buffer = Buffer.from(arrayBuffer);
                  archive.append(buffer, { name: `${folder}/${filename}` });
                }
              } else {
                // Try direct fetch as fallback
                const response = await fetch(url);
                if (!response.ok) {
                  console.warn(`Failed to fetch ${url}: ${response.statusText}`);
                  return;
                }
                const buffer = Buffer.from(await response.arrayBuffer());
                archive.append(buffer, { name: `${folder}/${filename}` });
              }
            }
          } catch (error) {
            console.error(`Error adding file ${url} to ZIP:`, error);
            // Continue with other files even if one fails
          }
        };

        // Add README.txt
        archive.append(readmeContent, { name: 'README.txt' });

        // Add images (if any)
        if (images.length > 0) {
          for (let i = 0; i < images.length; i++) {
            const image = images[i];
            const url = image.url;
            if (!url) {
              console.warn(`[Media Kit] Image ${i + 1} has no URL, skipping`);
              continue;
            }
            const extension = url.match(/\.(jpg|jpeg|png|webp|gif)$/i)?.[0] || '.jpg';
            const filename = `image-${String(i + 1).padStart(3, '0')}${extension}`;
            await addFileToZip(url, filename, 'images');
          }
        }

        // Add videos (if any)
        if (videos.length > 0) {
          for (let i = 0; i < videos.length; i++) {
            const video = videos[i];
            const url = video.url;
            if (!url) {
              console.warn(`[Media Kit] Video ${i + 1} has no URL, skipping`);
              continue;
            }
            const extension = url.match(/\.(mp4|mov|webm|avi)$/i)?.[0] || '.mp4';
            const filename = `video-${String(i + 1).padStart(3, '0')}${extension}`;
            await addFileToZip(url, filename, 'videos');
          }
        }

        // If no media files, add a note in README
        if (images.length === 0 && videos.length === 0) {
          console.log('[Media Kit] No media files to add, ZIP will contain README only');
        }

        // Finalize the archive
        await archive.finalize();
      },
    });

    // Return streaming response
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="property-${propertyId}-media-kit.zip"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[Media Kit] Error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json(
      { 
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && error instanceof Error ? { details: error.stack } : {}),
      }, 
      { status: statusCode }
    );
  }
}
