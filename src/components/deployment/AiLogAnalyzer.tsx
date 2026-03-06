"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { analyzeDeploymentLogs } from "@/lib/actions/deployment"; // Server Action
import { Loader2, Sparkles, Lightbulb } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

interface AiLogAnalyzerProps {
  initialLogs?: string;
}

export function AiLogAnalyzer({ initialLogs = "" }: AiLogAnalyzerProps) {
  const [logsToAnalyze, setLogsToAnalyze] = useState(initialLogs);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!logsToAnalyze.trim()) {
      setError("Please paste some logs to analyze.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result = await analyzeDeploymentLogs(logsToAnalyze);
      if (result.success && result.analysis) {
        setAnalysisResult(result.analysis);
      } else {
        setError(result.error || "Failed to get analysis.");
      }
    } catch (e) {
      setError("An unexpected error occurred during analysis.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Sparkles className="mr-2 h-5 w-5 text-accent" />
          AI Log Analyzer
        </CardTitle>
        <CardDescription>
          Paste your deployment logs below and let AI help you find issues and suggest fixes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Paste your deployment logs here..."
          value={logsToAnalyze}
          onChange={(e) => setLogsToAnalyze(e.target.value)}
          rows={10}
          className="font-mono text-xs"
        />
        <Button onClick={handleAnalyze} disabled={isLoading || !logsToAnalyze.trim()} className="w-full sm:w-auto">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
            </>
          ) : (
            <>
              <Lightbulb className="mr-2 h-4 w-4" /> Analyze Logs
            </>
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {analysisResult && (
          <Card className="bg-secondary/50">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Lightbulb className="mr-2 h-5 w-5 text-primary" />
                Analysis Result
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] w-full rounded-md p-1">
                <pre className="whitespace-pre-wrap text-sm text-foreground/90">{analysisResult}</pre>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
