import fs from 'fs';
import path from 'path';

export function saveBase64Image(base64Data: string, filename: string) {
  // Extract base64 content
  const base64Image = base64Data.split(';base64,').pop();
  const mimetype = base64Data.substring(
    base64Data.indexOf(':') + 1,
    base64Data.indexOf(';')
  );

  // Create uploads directory if not exists
  const uploadDir = path.join(process.cwd(), 'public/uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Save file
  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, base64Image, { encoding: 'base64' });

  return {
    filename,
    mimetype,
    encoding: 'base64',
    url: `/uploads/${filename}`, // Publicly accessible if "public" is served statically
  };
}
