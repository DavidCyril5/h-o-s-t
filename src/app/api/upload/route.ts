
import { type NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import FormData from 'form-data';

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.formData();
    const file = requestData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const data = new FormData();
    data.append('reqtype', 'fileupload');
    data.append('userhash', '');
    // Convert the File object to a Buffer and append it to the form data
    const fileBuffer = await file.arrayBuffer();
    data.append('fileToUpload', Buffer.from(fileBuffer), file.name);

    const config = {
      method: 'POST',
      url: 'https://catbox.moe/user/api.php',
      headers: {
        ...data.getHeaders(),
      },
      data: data,
    };

    const api = await axios.request(config);
    const url = api.data.trim();

    if (!url.startsWith('http')) {
        console.error("Catbox upload failed. Response:", url);
        return NextResponse.json({ error: "Failed to upload file to hosting service.", details: url }, { status: 500 });
    }

    return NextResponse.json({ url });

  } catch (error: any) {
    console.error("Error in upload route:", error);
    return NextResponse.json({ error: "An internal server error occurred.", details: error.message }, { status: 500 });
  }
}
