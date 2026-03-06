// src/app/api/genkit/[...slug]/route.ts
import { genkitNextHandler } from '@genkit-ai/next';
import '@/ai/flows/analyze-deployment-logs'; // Ensure flows are loaded
export { genkitNextHandler as GET, genkitNextHandler as POST };
