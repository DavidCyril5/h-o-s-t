'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Play, RefreshCw, CheckCircle } from 'lucide-react';
import {
  getAutomatedRedeployStatus,
  runAutomatedRedeploymentBatch,
  resetAutomatedRedeployment,
} from '@/lib/actions/redeploy';

const BATCH_COOLDOWN_SECONDS = 180; // 3 minutes

interface TaskState {
  status: 'idle' | 'running' | 'completed';
  processedDeploymentIds: string[];
  totalDeployments: number;
  lastBatchSentAt: string | null;
}

export default function AutomatedRedeployPage() {
  const [task, setTask] = useState<TaskState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const progress = task ? (task.processedDeploymentIds.length / task.totalDeployments) * 100 : 0;

  const fetchStatus = useCallback(async () => {
    try {
      const status = await getAutomatedRedeployStatus();
      setTask(status);
    } catch (e) {
      setError('Failed to fetch deployment status.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000); // Poll for status every 15 seconds
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    if (task?.status === 'running' && task.lastBatchSentAt) {
      const interval = setInterval(() => {
        const now = new Date();
        const lastBatchTime = new Date(task.lastBatchSentAt!).getTime();
        const diffSeconds = (now.getTime() - lastBatchTime) / 1000;
        
        if (diffSeconds < BATCH_COOLDOWN_SECONDS) {
          setCountdown(Math.ceil(BATCH_COOLDOWN_SECONDS - diffSeconds));
        } else {
          setCountdown(0);
          // If countdown is over, automatically trigger the next batch
          handleRunBatch();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [task]);

  const handleRunBatch = async () => {
    if (countdown > 0) return; // Prevent running during cooldown
    const result = await runAutomatedRedeploymentBatch();
    if (!result.success) {
      setError(result.message || 'An unknown error occurred.');
    } else {
      setError(null);
    }
    fetchStatus(); // Immediately refetch status after running a batch
  };

  const handleReset = async () => {
    setIsLoading(true);
    await resetAutomatedRedeployment();
    fetchStatus();
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-4">Automated Redeployment Center</h1>
      <p className="text-gray-600 mb-8">This tool processes all deployments in batches of 5 every 3 minutes to avoid API rate limits. Keep this page open for the process to continue automatically.</p>
      
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

      <div className="bg-white shadow-md rounded-lg p-6">
        {task?.status === 'completed' ? (
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold">Redeployment Complete</h2>
            <p className="text-gray-700">All {task.totalDeployments} deployments have been processed.</p>
            <button onClick={handleReset} className="mt-6 px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center justify-center mx-auto">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset Process
            </button>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Progress</h2>
              <span className="text-lg font-medium">{task?.processedDeploymentIds.length} / {task?.totalDeployments}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
              <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>

            <div className="text-center mt-8">
              {countdown > 0 ? (
                <div>
                  <p className="text-lg font-medium">Next batch in:</p>
                  <p className="text-4xl font-bold">{countdown}s</p>
                  <p className="text-sm text-gray-500 mt-2">Waiting for Heroku cooldown...</p>
                </div>
              ) : (
                <button 
                  onClick={handleRunBatch} 
                  disabled={task?.status === 'running'}
                  className="px-8 py-4 bg-green-600 text-white rounded-lg text-xl font-bold hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center mx-auto"
                >
                  {task?.status === 'idle' ? <Play className="mr-2 h-6 w-6" /> : <Loader2 className="mr-2 h-6 w-6 animate-spin" />} 
                  {task?.status === 'idle' ? 'Start Process' : 'Processing Batch...'}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
      <div className="mt-4 text-center">
         <button onClick={handleReset} className="text-sm text-gray-500 hover:text-gray-700 hover:underline">Reset and start over</button>
      </div>
    </div>
  );
}
