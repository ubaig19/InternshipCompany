import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

// S3 client configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

// Bucket name from environment variables
const bucketName = process.env.AWS_S3_BUCKET || 'intern-invite-portal';

/**
 * Validates a file for upload
 * @param file Express multer file object
 * @param allowedTypes Array of allowed MIME types
 * @param maxSizeBytes Maximum file size in bytes
 */
export function validateFile(
  file: Express.Multer.File,
  allowedTypes: string[] = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  maxSizeBytes: number = 5 * 1024 * 1024 // 5MB
): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds the limit of ${maxSizeBytes / (1024 * 1024)}MB`
    };
  }

  // Check file type
  if (!allowedTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Uploads a file to S3
 * @param file Express multer file object
 * @param prefix Optional prefix for the S3 key (folder path)
 */
export async function uploadToS3(
  file: Express.Multer.File,
  prefix: string = 'resumes'
): Promise<{ url: string; key: string }> {
  // Generate a unique file name
  const fileExtension = file.originalname.split('.').pop();
  const fileName = `${randomUUID()}.${fileExtension}`;
  const key = `${prefix}/${fileName}`;

  // Upload to S3
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read' // Make the file publicly accessible
  });

  try {
    await s3Client.send(command);
    // Construct the URL (this format will depend on your S3 configuration)
    const url = `https://${bucketName}.s3.amazonaws.com/${key}`;
    return { url, key };
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw new Error('Failed to upload file to S3');
  }
}
