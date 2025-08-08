import fs from 'fs';
import path from 'path';

export function saveBase64Image(base64Data: string, filename: string) {
  // Ensure base64Data is valid
  if (!base64Data.includes(';base64,')) {
    throw new Error('Invalid base64 string format');
  }

  const parts = base64Data.split(';base64,');
  const base64Image = parts[1] || ''; // fallback to empty string if missing

  const mimetype = base64Data.substring(
    base64Data.indexOf(':') + 1,
    base64Data.indexOf(';')
  );

  const uploadDir = path.join(process.cwd(), 'public/uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, filename);

  // ✅ Now TS knows this is a definite string
  fs.writeFileSync(filePath, base64Image, { encoding: 'base64' });

  return {
    filename,
    mimetype,
    encoding: 'base64',
    url: `/uploads/${filename}`,
  };
}
