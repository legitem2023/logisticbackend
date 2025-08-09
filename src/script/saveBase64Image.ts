import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://tsbriguuaznlvwbnylop.supabase.co'
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzYnJpZ3V1YXpubHZ3Ym55bG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY5MDIzOTksImV4cCI6MjA0MjQ3ODM5OX0.oKpulUfQth5hNyZVRgw_uPBnkhrcD1LP61CPmW3U-gA"
const supabase = createClient(supabaseUrl, supabaseKey)

export async function saveBase64Image(base64Data: string) {
  // Validate base64 format
  if (!base64Data.includes(';base64,')) {
    throw new Error('Invalid base64 string format');
  }

  // Extract metadata and data
  const [header, data] = base64Data.split(';base64,');
  const mimetype = header.split(':')[1];
  
  // Determine file extension from mimetype
  const extension = mimetype.split('/')[1];
  if (!extension) throw new Error('Invalid image mimetype');

  // Generate unique filename with UUID
  const filename = `${uuidv4()}.${extension}`;
  const filePath = `uploads/${filename}`;

  try {
    // Convert base64 to Buffer
    const buffer = Buffer.from(data, 'base64');

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from('legitemfiles')  // Replace with your bucket name
      .upload(filePath, buffer, {
        contentType: mimetype,
        cacheControl: '3600',  // 1 hour cache
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('legitemfiles')
      .getPublicUrl(filePath);

    return {
      filename,
      mimetype,
      filePath,
      url: urlData.publicUrl
    };
  } catch (error) {
    console.error('Supabase upload failed:', error);
    throw new Error('Image upload failed');
  }
}
