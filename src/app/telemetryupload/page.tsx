'use client';

import { useState } from 'react';
import { uploadTelemetrySession } from './actions';
import { TelemetryParser } from '@/lib/telemetry/parser';
import { useRouter } from 'next/navigation';

export default function TelemetryUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setStatus('Parsing file locally...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const parser = new TelemetryParser(arrayBuffer, 6);
      const parsedPackets = parser.parseAll();

      if (parsedPackets.length === 0) {
        throw new Error('No valid telemetry data found in file.');
      }

      setStatus('Sending data to server...');

      // In a production app, leagueId and raceId would be selected by the user via a dropdown.
      // For this implementation, we use placeholders to demonstrate the pipeline.
      const payload = {
        leagueId: '00000000-0000-0000-0000-000000000002', 
        raceId: '00000000-0000-0000-0000-000000000003', 
        trackId: 1,
        sessionData: {
          header: parsedPackets[0].header,
          participants: parsedPackets.find(p => p.type === 'participants')?.m_participants || [],
          motionPackets: parsedPackets.filter(p => p.type === 'motion'),
          telemetryPackets: parsedPackets.filter(p => p.type === 'car_telemetry'),
          lapDataPackets: parsedPackets.filter(p => p.type === 'lap_data'),
        }
      };

      const result = await uploadTelemetrySession(payload);

      if (result.success) {
        setStatus('Upload successful!');
        setTimeout(() => router.push('/dashboard'), 2000);
      }
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Upload Telemetry (.bin)</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select F1 25 Telemetry File
        </label>
        <input
          type="file"
          accept=".bin"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
      </div>

      {file && (
        <div className="mb-6 p-3 bg-blue-50 rounded text-blue-700 text-sm">
          Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || isUploading}
        className={`w-full py-2 px-4 rounded font-semibold text-white transition
          ${!file || isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        {isUploading ? 'Processing...' : 'Upload & Parse'}
      </button>

      {status && (
        <div className={`mt-4 p-3 rounded text-center text-sm ${status.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {status}
        </div>
      )}
    </div>
  );
}
