'use server';

import { getDb } from "@/lib/mongodb";
import type { Deployment, PlatformApiKey } from "@/lib/types";
import { revalidatePath } from "next/cache";

const BATCH_SIZE = 5;
const BATCH_COOLDOWN_SECONDS = 180; // 3 minutes

// --- DATABASE AND STATE MANAGEMENT --- //

async function getTaskState() {
  const db = await getDb();
  const collection = db.collection('systemState');
  const taskState = await collection.findOne({ _id: 'global-redeploy' });

  if (!taskState) {
    const total = await db.collection('deployments').countDocuments();
    const initialState = {
      _id: 'global-redeploy',
      status: 'idle', // idle, running, completed
      processedDeploymentIds: [],
      totalDeployments: total,
      lastBatchSentAt: null,
    };
    await collection.insertOne(initialState);
    return initialState;
  }
  return taskState;
}

// --- SERVER ACTIONS FOR THE UI --- //

export async function getAutomatedRedeployStatus() {
  const state = await getTaskState();
  return JSON.parse(JSON.stringify(state));
}

export async function resetAutomatedRedeployment() {
  const db = await getDb();
  const total = await db.collection('deployments').countDocuments();
  await db.collection('systemState').updateOne(
    { _id: 'global-redeploy' },
    {
      $set: {
        status: 'idle',
        processedDeploymentIds: [],
        totalDeployments: total,
        lastBatchSentAt: null,
      },
    },
    { upsert: true }
  );
  revalidatePath("/admin/redeploy");
  return { success: true, message: 'Redeployment process has been reset.' };
}

export async function runAutomatedRedeploymentBatch() {
  const db = await getDb();
  const task = await getTaskState();

  if (task.status === 'completed') {
    return { success: false, message: 'All deployments have already been processed.' };
  }

  if (task.lastBatchSentAt) {
    const now = new Date();
    const diffSeconds = (now.getTime() - new Date(task.lastBatchSentAt).getTime()) / 1000;
    if (diffSeconds < BATCH_COOLDOWN_SECONDS) {
      const remaining = Math.ceil(BATCH_COOLDOWN_SECONDS - diffSeconds);
      return { success: false, message: `Cooldown active. Please wait ${remaining} seconds.` };
    }
  }

  const deploymentsToProcess = await db.collection('deployments').find(
    { id: { $nin: task.processedDeploymentIds || [] } }
  ).limit(BATCH_SIZE).toArray();

  if (deploymentsToProcess.length === 0) {
    await db.collection('systemState').updateOne({ _id: 'global-redeploy' }, { $set: { status: 'completed' } });
    revalidatePath("/admin/redeploy");
    return { success: true, message: 'All deployments have now been processed.' };
  }

  // Mark task as running and update timestamp BEFORE starting the builds
  await db.collection('systemState').updateOne({ _id: 'global-redeploy' }, { $set: { status: 'running', lastBatchSentAt: new Date().toISOString() } });

  const results = await triggerBatch(deploymentsToProcess);
  
  const successfulIds = results.filter(r => r.success).map(r => {
      const deployment = deploymentsToProcess.find(d => d.appName === r.appName);
      return deployment.id;
  });

  const newProcessedIds = [...(task.processedDeploymentIds || []), ...successfulIds];
  const isCompleted = newProcessedIds.length >= task.totalDeployments;

  await db.collection('systemState').updateOne(
    { _id: 'global-redeploy' },
    {
        $set: {
            processedDeploymentIds: newProcessedIds,
            status: isCompleted ? 'completed' : 'running'
        }
    }
  );

  revalidatePath("/admin/redeploy");
  const failedCount = deploymentsToProcess.length - successfulIds.length;
  return {
      success: true,
      message: `Batch processed: ${successfulIds.length} succeeded, ${failedCount} failed.`
  };
}

// --- HEROKU API LOGIC --- //

async function triggerBatch(deployments: Deployment[]) {
    const db = await getDb();
    const apiKeys = await db.collection<PlatformApiKey>("apiKeys").find({}).toArray();
    const apiKeyMap = new Map(apiKeys.map(key => [key._id.toString(), key.key]));
    const activeApiKey = apiKeys.find(key => key.isActive)?.key;

    if (!activeApiKey) {
        throw new Error("No active API key configured.");
    }

    const promises = deployments.map(deployment => {
        const apiKey = deployment.apiKeyId ? apiKeyMap.get(deployment.apiKeyId.toString()) : activeApiKey;
        return triggerHerokuBuild(deployment, apiKey || activeApiKey);
    });

    return Promise.all(promises);
}

async function triggerHerokuBuild(deployment: Deployment, apiKey: string) {
    const url = `https://api.heroku.com/apps/${deployment.appName}/builds`;
    const headers = {
        "Content-Type": "application/json",
        Accept: "application/vnd.heroku+json; version=3",
        Authorization: `Bearer ${apiKey}`,
    };
    
    // Use the deployment's githubRepoUrl or fallback to default V5
    const githubRepoUrl = deployment.githubRepoUrl || `https://github.com/DavidCyrilTech/Anita-V5`;
    const sourceBlobUrl = `${githubRepoUrl}/tarball/main/`;
    
    const body = JSON.stringify({
        source_blob: {
            url: sourceBlobUrl,
            version: `redeploy-${new Date().toISOString()}`,
        },
    });

    try {
        const response = await fetch(url, { method: "POST", headers, body });
        const result = await response.json();
        return response.ok
            ? { success: true, appName: deployment.appName }
            : { success: false, appName: deployment.appName, error: result };
    } catch (error) {
        return { success: false, appName: deployment.appName, error: (error as Error).message };
    }
}