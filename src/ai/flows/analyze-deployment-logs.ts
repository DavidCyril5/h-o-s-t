'use server';

/**
 * @fileOverview Analyzes deployment logs to identify errors, warnings, and suggest fixes.
 *
 * - analyzeDeploymentLogs - A function that handles the analysis of deployment logs.
 * - AnalyzeDeploymentLogsInput - The input type for the analyzeDeploymentLogs function.
 * - AnalyzeDeploymentLogsOutput - The return type for the analyzeDeploymentLogs function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeDeploymentLogsInputSchema = z.object({
  deploymentLogs: z
    .string()
    .describe('The deployment logs to analyze.'),
});
export type AnalyzeDeploymentLogsInput = z.infer<typeof AnalyzeDeploymentLogsInputSchema>;

const AnalyzeDeploymentLogsOutputSchema = z.object({
  analysisResult: z.string().describe('The analysis result of the deployment logs, including identified errors, warnings, and suggested fixes.'),
});
export type AnalyzeDeploymentLogsOutput = z.infer<typeof AnalyzeDeploymentLogsOutputSchema>;

export async function analyzeDeploymentLogs(input: AnalyzeDeploymentLogsInput): Promise<AnalyzeDeploymentLogsOutput> {
  return analyzeDeploymentLogsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeDeploymentLogsPrompt',
  input: {schema: AnalyzeDeploymentLogsInputSchema},
  output: {schema: AnalyzeDeploymentLogsOutputSchema},
  prompt: `You are an AI expert in analyzing deployment logs for potential errors, warnings, and suggesting fixes.

Analyze the following deployment logs and provide a detailed analysis result including:
- Identified errors and warnings.
- Suggested fixes or optimizations to resolve deployment issues.

Deployment Logs:
{{{deploymentLogs}}}`,
});

const analyzeDeploymentLogsFlow = ai.defineFlow(
  {
    name: 'analyzeDeploymentLogsFlow',
    inputSchema: AnalyzeDeploymentLogsInputSchema,
    outputSchema: AnalyzeDeploymentLogsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
