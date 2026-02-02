import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const image = formData.get('image') as File;

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        // Convert file to base64
        const bytes = await image.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64Image = buffer.toString('base64');

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
      Extract the race results from this Formula 1 25 (F1 25) race recap image.
      Return the data in the following JSON format:
      {
        "rankings": [
          {
            "name": "Driver Name",
            "position": 1,
            "fastest_lap": true/false,
            "clean_driver": true/false
          }
        ]
      }
      
      Important:
      - Only include drivers visible in the image.
      - If 'Fastest Lap' icon is visible next to a driver, set fastest_lap to true.
      - Use your knowledge of F1 25 UI to identify 'Clean Driver' or 'Fastest Lap' indicators.
      - If unsure about a flag, default to false.
      - Return ONLY the JSON. No markdown preamble.
    `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: image.type,
                },
            },
        ]);

        const response = await result.response;
        const text = response.text();

        // Clean up potential markdown code blocks if Gemini includes them
        const cleanJson = text.replace(/```json|```/g, '').trim();
        const rankings = JSON.parse(cleanJson);

        return NextResponse.json(rankings);
    } catch (error: any) {
        console.error('Gemini Extraction Error:', error);
        return NextResponse.json({ error: 'Failed to extract results' }, { status: 500 });
    }
}
