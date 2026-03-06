"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal } from "lucide-react";
import { useEffect, useState, useRef } from "react";

interface LogDisplayProps {
  logs: string[];
  isLoading?: boolean;
}

export function LogDisplay({ logs: initialLogs, isLoading }: LogDisplayProps) {
  const [logs, setLogs] = useState<string[]>(initialLogs);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollableViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollableViewport) {
        scrollableViewport.scrollTop = scrollableViewport.scrollHeight;
      }
    }
  }, [logs]);


  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Terminal className="mr-2 h-5 w-5 text-primary" />
          Deployment Logs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full rounded-md border bg-muted/30 p-4" ref={scrollAreaRef}>
          {isLoading && logs.length === 0 && <p className="text-muted-foreground">Loading logs...</p>}
          {!isLoading && logs.length === 0 && <p className="text-muted-foreground">No logs to display yet.</p>}
          {logs.map((log, index) => (
            <p key={index} className="text-xs font-mono whitespace-pre-wrap break-all leading-relaxed">
              <span className={
                log.toLowerCase().includes("error") ? "text-red-500" : 
                log.toLowerCase().includes("warn") ? "text-yellow-500" : 
                log.toLowerCase().includes("info") ? "text-blue-400" : "text-foreground/80"
              }>
                {log}
              </span>
            </p>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
