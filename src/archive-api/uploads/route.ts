import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseStorageBucket } from '@/infrastructure/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `slip_${Date.now()}_${safeOriginalName}`;
    const destination = `slips/${filename}`;

    const bucket = getFirebaseStorageBucket();
    const fileRef = bucket.file(destination);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type || 'image/jpeg',
        cacheControl: 'public, max-age=31536000',
      },
    });

    try {
      await fileRef.makePublic();
    } catch {
      // Bucket might enforce uniform bucket-level access
    }

    // Direct Google Cloud Storage public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
    });
  } catch (error) {
    console.error('Failed to upload file to Firebase Storage:', error);
    return NextResponse.json({ error: 'Failed to process file upload' }, { status: 500 });
  }
}
