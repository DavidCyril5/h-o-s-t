"use server";

import type { DeploymentFormInput } from "../schemas"; // Corrected import path
import type { Deployment, DeploymentStatus, PlatformApiKey } from "../types";
import { analyzeDeploymentLogs as analyzeLogsFlow, type AnalyzeDeploymentLogsInput } from "../../ai/flows/analyze-deployment-logs";
import { getDb } from "../mongodb";
import { ObjectId } from 'mongodb';
import { getLoggedInUser } from "./auth";
import { getActivePlatformApiKey, getApiKeyById } from "./admin";
import { revalidatePath } from "next/cache";
import { logCoinTransaction } from "./transactions"; // Added import

const DEPLOYMENT_COST = 50;
const GLOBAL_DEPLOYMENT_LIMIT_PER_API_KEY = 100; 
const HEROKU_API_BASE_URL = "https://api.heroku.com";
const HEROKU_STACK = "heroku-22";


async function herokuApiCall(
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  apiKey: string, 
  body?: any
): Promise<any> {
  const headers = {
    'Accept': 'application/vnd.heroku+json; version=3',
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${HEROKU_API_BASE_URL}${endpoint}`, options);
    if (!response.ok) {
      if (method === 'DELETE' && response.status === 404) {
        return { status: 404, message: "Resource not found on Heroku (already deleted or never existed)." };
      }
      const errorBody = await response.json().catch(() => ({ message: response.statusText }));
      console.error(`Heroku API Error (${method} ${endpoint}): ${response.status}`, errorBody);
      throw new Error(`Heroku API Error: ${errorBody.message || response.statusText} (Status: ${response.status})`);
    }
    if (response.status === 204 || response.headers.get("content-length") === "0") {
        return null;
    }
    return response.json();
  } catch (error) {
    console.error(`Network or parsing error during Heroku API call (${method} ${endpoint}):`, error);
    throw error;
  }
}


export async function createNewDeployment(data: DeploymentFormInput): Promise<{ success: boolean; message: string; deployment?: Deployment }> {
  const user = await getLoggedInUser();
  if (!user) {
    return { success: false, message: "You must be logged in to create a deployment." };
  }

  const activeApiKeyDoc = await getActivePlatformApiKey();
  if (!activeApiKeyDoc || !activeApiKeyDoc.key) {
    return { success: false, message: "Active Platform API Key is not configured. Deployment cannot proceed." };
  }
  const herokuApiKey = activeApiKeyDoc.key;
  const apiKeyIdUsed = activeApiKeyDoc._id;


  try {
    const db = await getDb();
    const deploymentsCollection = db.collection<Deployment>("deployments");
    const usersCollection = db.collection("users");

    const currentDeploymentsForApiKey = await deploymentsCollection.countDocuments({ apiKeyId: apiKeyIdUsed });
    if (currentDeploymentsForApiKey >= GLOBAL_DEPLOYMENT_LIMIT_PER_API_KEY) {
      return { success: false, message: "No servers available at the moment. Please try again later." };
    }

    if (user.role !== 'admin') {
      const userDoc = await usersCollection.findOne({ _id: user._id });
      if (!userDoc || userDoc.coins < DEPLOYMENT_COST) {
        return { success: false, message: `Insufficient coins. You need ${DEPLOYMENT_COST} coins. You have ${userDoc?.coins || 0}.` };
      }
    }

    const appNameInput = data.PLATFORM_APP_NAME || `anita-bot-${user.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0,8)}-${new ObjectId().toString().slice(-4)}`;
    const herokuAppName = appNameInput.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30);
    const appNameProvidedByUser = !!data.PLATFORM_APP_NAME;

    const existingDeployment = await deploymentsCollection.findOne({ appName: herokuAppName });
    if (existingDeployment) {
      return { success: false, message: `A deployment with app name '${herokuAppName}' already exists in our records. Please choose a different name or let one be auto-generated.` };
    }

    const now = new Date();
    const githubRepoUrl = data.githubRepoUrl || `https://github.com/DavidCyrilTech/Anita-${data.anitaVersion || "V5"}`;
    const initialLogs: string[] = [
      `[SYSTEM] Info: ${now.toISOString()} - Deployment creation initiated by user ${user.email} for Heroku app: ${herokuAppName}. Using API Key ID: ${apiKeyIdUsed}`,
      `[SYSTEM] Info: ${now.toISOString()} - Target GitHub Repo: ${githubRepoUrl}`
    ];

    let herokuApp;
    try {
      initialLogs.push(`[SYSTEM] Info: ${now.toISOString()} - Attempting to create Heroku app '${herokuAppName}'...`);
      herokuApp = await herokuApiCall('/apps', 'POST', herokuApiKey, { name: herokuAppName, region: 'us', stack: HEROKU_STACK });
      initialLogs.push(`[SYSTEM] Success: ${new Date().toISOString()} - Heroku app '${herokuAppName}' (ID: ${herokuApp.id}) created successfully. Web URL: ${herokuApp.web_url}`);
    } catch (error: any) {
      if (error.message && error.message.includes("Name") && error.message.includes("is already taken") && error.message.includes("(Status: 422)")) {
        initialLogs.push(`[SYSTEM] Error: ${new Date().toISOString()} - Heroku app name '${herokuAppName}' is already taken.`);
        let userMessage = `The app name '${herokuAppName}' is already taken on Heroku. `;
        if (appNameProvidedByUser) {
            userMessage += "Please choose a different name for your app and try again.";
        } else {
            userMessage += "This name was auto-generated. Please try deploying again, as a new name will be generated.";
        }
        return { success: false, message: userMessage };
      }

      initialLogs.push(`[SYSTEM] Error: ${new Date().toISOString()} - Failed to create Heroku app: ${error.message}. The app was not created on Heroku.`);
 return { success: false, message: "No servers available at the moment. Please try again later." };
    }

    initialLogs.push(`[SYSTEM] Info: ${new Date().toISOString()} - Setting environment variables for '${herokuAppName}'...`);
    const envVarsToSet = { ...data };
    delete envVarsToSet.PLATFORM_APP_NAME;
    const herokuConfigVars = { ...envVarsToSet, GITHUB_REPO_URL: githubRepoUrl };

    try {
      await herokuApiCall(`/apps/${herokuApp.id}/config-vars`, 'PATCH', herokuApiKey, herokuConfigVars);
      initialLogs.push(`[SYSTEM] Success: ${new Date().toISOString()} - Environment variables set successfully.`);
    } catch (error: any) {
      initialLogs.push(`[SYSTEM] Error: ${new Date().toISOString()} - Failed to set environment variables: ${error.message}. Cleaning up Heroku app '${herokuApp.name}'.`);
      await herokuApiCall(`/apps/${herokuApp.id}`, 'DELETE', herokuApiKey).catch(delErr => console.error("Cleanup error after failing to set config vars:", delErr));
      return { success: false, message: `Failed to set Heroku environment variables for '${herokuAppName}'. The partially created app has been automatically cleaned up. Reason: ${error.message}` };
    }

    initialLogs.push(`[SYSTEM] Info: ${new Date().toISOString()} - Triggering build from GitHub repository '${githubRepoUrl}'...`);
    let build;
    try {
      build = await herokuApiCall(`/apps/${herokuApp.id}/builds`, 'POST', herokuApiKey, {
        source_blob: {
          url: `${githubRepoUrl}/tarball/main/`,
          version: 'main'
        },
      });
      initialLogs.push(`[SYSTEM] Success: ${new Date().toISOString()} - Build initiated successfully. Build ID: ${build.id}, Status: ${build.status}.`);
    } catch (error: any) {
      initialLogs.push(`[SYSTEM] Error: ${new Date().toISOString()} - Failed to trigger build: ${error.message}. Cleaning up Heroku app '${herokuApp.name}'.`);
      await herokuApiCall(`/apps/${herokuApp.id}`, 'DELETE', herokuApiKey).catch(delErr => console.error("Cleanup error after failing to trigger build:", delErr));
      return { success: false, message: `Failed to trigger Heroku build for '${herokuAppName}'. The partially created app has been automatically cleaned up. Reason: ${error.message}` };
    }

    // If build status is immediately 'failed' (though unusual, typically it's 'pending')
    if (build.status === 'failed') {
        initialLogs.push(`[SYSTEM] Error: ${new Date().toISOString()} - Build failed immediately (ID: ${build.id}). Cleaning up Heroku app '${herokuApp.name}'.`);
        await herokuApiCall(`/apps/${herokuApp.id}`, 'DELETE', herokuApiKey).catch(delErr => console.error("Cleanup error after immediate build failure:", delErr));
        // Store a failed deployment record locally for tracking/logging
        const failedDeploymentData: Omit<Deployment, '_id'> = {
            id: herokuApp.id, userId: user._id, appName: herokuApp.name, status: 'failed',
            createdAt: now.toISOString(), region: herokuApp.region.name, logs: initialLogs,
            envVariables: { ...data }, githubRepoUrl: githubRepoUrl, apiKeyId: apiKeyIdUsed,
        };
        await deploymentsCollection.insertOne(failedDeploymentData);
        revalidatePath("/dashboard");
        return { success: false, message: `Heroku build for '${herokuAppName}' failed immediately. The app has been automatically cleaned up. Check logs for details.` };
    }


    const newDeploymentData: Omit<Deployment, '_id'> = {
      id: herokuApp.id, 
      userId: user._id,
      appName: herokuApp.name,
      status: build.status === 'succeeded' ? 'succeeded' : 'deploying',
      createdAt: now.toISOString(),
      lastDeployedAt: build.status === 'succeeded' ? new Date(build.updated_at).toISOString() : undefined,
      region: herokuApp.region.name,
      url: herokuApp.web_url,
      logs: initialLogs,
      envVariables: { ...data },
      githubRepoUrl: githubRepoUrl,
      apiKeyId: apiKeyIdUsed, 
    };

    const insertResult = await deploymentsCollection.insertOne(newDeploymentData);
    if (!insertResult.insertedId) {
      initialLogs.push(`[SYSTEM] Error: ${new Date().toISOString()} - Failed to save deployment to local database. Critical error. Heroku app '${herokuApp.name}' might be orphaned.`);
      await herokuApiCall(`/apps/${herokuApp.id}`, 'DELETE', herokuApiKey).catch(delErr => console.error("Critical: Cleanup error for orphaned Heroku app:", delErr));
      return { success: false, message: "Critical: Failed to save deployment to local database after Heroku setup." };
    }

    if (user.role !== 'admin') {
      const updatedUser = await usersCollection.findOneAndUpdate(
        { _id: user._id },
        { $inc: { coins: -DEPLOYMENT_COST } },
        { returnDocument: "after" }
      );
      if (updatedUser) {
        await logCoinTransaction({
            userId: user._id,
            type: 'deployment_cost',
            amount: -DEPLOYMENT_COST,
            description: `Deployment cost for app: ${newDeploymentData.appName}`,
            balanceAfter: updatedUser.coins,
            relatedTransactionId: newDeploymentData.id, // Heroku app ID
        });
      }
    }

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/deployments/${newDeploymentData.id}`);

    return {
      success: true,
      message: `Heroku deployment for '${newDeploymentData.appName}' initiated! ${user.role !== 'admin' ? `${DEPLOYMENT_COST} coins deducted.` : ''} Build status: ${build.status}. Check deployment details for updates.`,
      deployment: { ...newDeploymentData, _id: insertResult.insertedId.toString() }
    };

  } catch (error: any) {
    console.error("Error creating new Heroku deployment:", error);
    const message = error.message || "An unexpected error occurred during Heroku deployment.";
    return { success: false, message };
  }
}

async function getHerokuKeyForDeployment(deploymentDoc?: Deployment | null): Promise<string | null> {
  if (deploymentDoc?.apiKeyId) {
    const specificKeyDoc = await getApiKeyById(deploymentDoc.apiKeyId);
    if (specificKeyDoc?.key) {
      return specificKeyDoc.key;
    }
    console.warn(`API key with ID ${deploymentDoc.apiKeyId} not found for deployment ${deploymentDoc.id}. Falling back to active key.`);
  }
  const activeKeyDoc = await getActivePlatformApiKey();
  return activeKeyDoc?.key || null;
}


export async function getDeployments(): Promise<Deployment[]> {
  const user = await getLoggedInUser();
  if (!user) return [];

  try {
    const db = await getDb();
    const query = user.role === 'admin' ? {} : { userId: user._id };
    const deployments = await db.collection<Deployment>("deployments")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return deployments.map(d => ({ ...d, _id: d._id?.toString() }));
  } catch (error) {
    console.error("Error fetching deployments:", error);
    return [];
  }
}

export async function getDeploymentById(id: string): Promise<Deployment | null> {
  const user = await getLoggedInUser();
  if (!user) return null;

  try {
    const db = await getDb();
    const deployment = await db.collection<Deployment>("deployments").findOne({ id: id });

    if (!deployment) return null;
    if (deployment.userId !== user._id && user.role !== 'admin') return null;

    if (deployment.status === 'deploying' || deployment.status === 'pending') {
      const herokuApiKey = await getHerokuKeyForDeployment(deployment);
      if (herokuApiKey) {
        try {
          const formation = await herokuApiCall(`/apps/${deployment.id}/formation/web`, 'GET', herokuApiKey);
          let appStatusBasedOnDynos: DeploymentStatus = deployment.status;
          if (formation && formation.quantity > 0) {
             if(deployment.status === 'deploying') appStatusBasedOnDynos = 'succeeded';
          } else if (formation && formation.quantity === 0 && deployment.status !== 'stopped') {
            appStatusBasedOnDynos = 'stopped';
          }

          const builds = await herokuApiCall(`/apps/${deployment.id}/builds`, 'GET', herokuApiKey);
          let newStatusFromBuild = deployment.status;
          let lastDeployedAtFromBuild = deployment.lastDeployedAt;

          if (builds && builds.length > 0) {
            const latestBuild = builds.sort((a:any, b:any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            newStatusFromBuild = latestBuild.status === 'succeeded' ? 'succeeded' : latestBuild.status === 'failed' ? 'failed' : 'deploying';
            lastDeployedAtFromBuild = new Date(latestBuild.updated_at).toISOString();
          }

          let finalNewStatus = deployment.status;
          if (newStatusFromBuild === 'succeeded' || newStatusFromBuild === 'failed') {
            finalNewStatus = newStatusFromBuild;
          } else if (appStatusBasedOnDynos !== deployment.status) {
            finalNewStatus = appStatusBasedOnDynos;
          }

          if (finalNewStatus !== deployment.status || (finalNewStatus === 'succeeded' && lastDeployedAtFromBuild !== deployment.lastDeployedAt)) {
            deployment.status = finalNewStatus;
            deployment.lastDeployedAt = finalNewStatus === 'succeeded' ? lastDeployedAtFromBuild : deployment.lastDeployedAt;

            const statusUpdateLog = `[SYSTEM] Info: ${new Date().toISOString()} - Heroku status sync. App status: ${finalNewStatus}. Latest build status: ${newStatusFromBuild}.`;
            const updatedLogs = [...(deployment.logs || []), statusUpdateLog].slice(-500);

            await db.collection<Deployment>("deployments").updateOne(
              { id: deployment.id },
              { $set: { status: finalNewStatus, lastDeployedAt: deployment.lastDeployedAt, logs: updatedLogs } }
            );
            deployment.logs = updatedLogs;
            revalidatePath(`/dashboard/deployments/${deployment.id}`);
          }
        } catch (herokuError: any) {
          const errorLog = `[SYSTEM] Warning: ${new Date().toISOString()} - Could not fetch live status from Heroku: ${herokuError.message}`;
           const updatedLogs = [...(deployment.logs || []), errorLog].slice(-500);
          await db.collection<Deployment>("deployments").updateOne(
             { id: deployment.id },
             { $set: { logs: updatedLogs } }
           );
           deployment.logs = updatedLogs;
        }
      }
    }
    return { ...deployment, _id: deployment._id?.toString() };
  } catch (error) {
    console.error(`Error fetching deployment by ID '${id}':`, error);
    return null;
  }
}


export async function getDeploymentLogs(deploymentId: string): Promise<string[]> {
  const user = await getLoggedInUser();
  if (!user) return [`[SYSTEM] Error: Unauthorized to fetch logs.`];

  const db = await getDb();
  const deploymentsCollection = db.collection<Deployment>("deployments");
  const deployment = await deploymentsCollection.findOne({ id: deploymentId });

  if (!deployment) return [`[SYSTEM] Info: No deployment found with ID ${deploymentId}.`];
  if (deployment.userId !== user._id && user.role !== 'admin') {
    return [`[SYSTEM] Error: Unauthorized to fetch logs for this deployment.`];
  }
  
  const herokuApiKey = await getHerokuKeyForDeployment(deployment);
  if (!herokuApiKey) return [...(deployment.logs || []), `[SYSTEM] Error: Heroku API Key not configured or resolvable. Cannot fetch live logs.`];


  const timestamp = new Date().toISOString();
  let fetchedHerokuLogs: string[] = [];

  try {
    const logSession = await herokuApiCall(
      `/apps/${deployment.id}/log-sessions`,
      'POST',
      herokuApiKey,
      { lines: 200, source: 'app', tail: false } 
    );

    if (logSession && logSession.logplex_url) {
      const logStreamResponse = await fetch(logSession.logplex_url);
      if (logStreamResponse.ok) {
        const rawLogs = await logStreamResponse.text();
        fetchedHerokuLogs = rawLogs.split('\n').filter(line => line.trim() !== '');
        if (fetchedHerokuLogs.length > 0) {
            fetchedHerokuLogs.unshift(`[SYSTEM] Info: ${timestamp} - Successfully fetched ${fetchedHerokuLogs.length} recent log lines from Heroku.`);
        } else {
            fetchedHerokuLogs.push(`[SYSTEM] Info: ${timestamp} - No recent logs returned from Heroku for this app.`);
        }
      } else {
        const errorMsg = `[SYSTEM] Error: ${timestamp} - Failed to fetch logs from Heroku logplex_url. Status: ${logStreamResponse.status}`;
        fetchedHerokuLogs = [errorMsg]; 
      }
    } else {
      const errorMsg = `[SYSTEM] Error: ${timestamp} - Failed to create Heroku log session. Response: ${JSON.stringify(logSession)}`;
      fetchedHerokuLogs = [errorMsg];
    }
  } catch (error: any) {
    console.error(`Error fetching live logs from Heroku for '${deployment.appName}':`, error);
    const errorMsg = `[SYSTEM] Error: ${timestamp} - Exception during Heroku log fetch: ${error.message}`;
    fetchedHerokuLogs = [errorMsg];
  }

  const currentDbLogs = deployment.logs || [];
  const logsToStore = [...currentDbLogs, ...fetchedHerokuLogs].slice(-500);

  await deploymentsCollection.updateOne(
    { id: deployment.id },
    { $set: { logs: logsToStore } }
  );
  revalidatePath(`/dashboard/deployments/${deployment.id}`);
  return logsToStore;
}


export async function controlDeployment(deploymentId: string, action: "start" | "stop" | "restart" | "redeploy"): Promise<{ success: boolean; message: string; newStatus?: DeploymentStatus }> {
  const user = await getLoggedInUser();
  if (!user) return { success: false, message: "Unauthorized." };

  const db = await getDb();
  const deploymentsCollection = db.collection<Deployment>("deployments");
  const deployment = await deploymentsCollection.findOne({ id: deploymentId });

  if (!deployment) return { success: false, message: "Deployment not found." };
  if (deployment.userId !== user._id && user.role !== 'admin') {
    return { success: false, message: "Unauthorized to control this deployment." };
  }
  
  const herokuApiKey = await getHerokuKeyForDeployment(deployment);
  if (!herokuApiKey) {
    return { success: false, message: "Heroku API Key is not configured or resolvable for this deployment." };
  }

  const herokuAppIdOrName = deployment.id; 
  let newDbStatus: DeploymentStatus = deployment.status;
  const timestamp = new Date().toISOString();
  let logMessage = `[SYSTEM] Info: ${timestamp} - User ${user.email} requested Heroku action '${action}' on app '${deployment.appName}'.`;
  let herokuSuccess = false;

  try {
    switch (action) {
      case "start":
        logMessage += ` Attempting to scale web dynos to 1.`;
        await herokuApiCall(`/apps/${herokuAppIdOrName}/formation/web`, 'PATCH', herokuApiKey, { quantity: 1 });
        newDbStatus = 'deploying'; 
        logMessage += ` Heroku accepted scale command. App is starting. Status set to 'deploying'.`;
        herokuSuccess = true;
        break;
      case "stop":
        logMessage += ` Attempting to scale web dynos to 0.`;
        await herokuApiCall(`/apps/${herokuAppIdOrName}/formation/web`, 'PATCH', herokuApiKey, { quantity: 0 });
        newDbStatus = 'stopped';
        logMessage += ` Heroku accepted scale command. App should be stopping. Status set to 'stopped'.`;
        herokuSuccess = true;
        break;
      case "restart":
        logMessage += ` Attempting to restart all dynos.`;
        await herokuApiCall(`/apps/${herokuAppIdOrName}/dynos`, 'DELETE', herokuApiKey);
        newDbStatus = 'deploying'; 
        logMessage += ` Heroku accepted restart command. App is restarting. Status set to 'deploying'.`;
        herokuSuccess = true;
        break;
      case "redeploy":
        logMessage += ` Attempting to trigger a new build from GitHub repository '${deployment.githubRepoUrl}'.`;
        const build = await herokuApiCall(`/apps/${herokuAppIdOrName}/builds`, 'POST', herokuApiKey, {
          source_blob: {
            url: `${deployment.githubRepoUrl}/tarball/main/`,
            version: 'main'
          },
        });
        newDbStatus = 'deploying';
        logMessage += ` Heroku accepted build command. New build initiated (ID: ${build.id}). Status set to 'deploying'.`;
        herokuSuccess = true;
        break;
    }

    if (herokuSuccess) {
      const updatedLogs = [...(deployment.logs || []), logMessage].slice(-500);
      await deploymentsCollection.updateOne(
        { id: deploymentId },
        { $set: { status: newDbStatus, logs: updatedLogs, lastDeployedAt: new Date().toISOString() } } 
      );
      revalidatePath(`/dashboard/deployments/${deploymentId}`);
      return { success: true, message: `Heroku action '${action}' on '${deployment.appName}' initiated. New status: ${newDbStatus}.`, newStatus: newDbStatus };
    } else {
      logMessage += ` Failed to execute Heroku command for '${action}'.`;
      const updatedLogs = [...(deployment.logs || []), logMessage].slice(-500);
      await deploymentsCollection.updateOne({ id: deploymentId }, { $set: {logs: updatedLogs }});
      return { success: false, message: `Failed to execute Heroku command for '${action}'.` };
    }

  } catch (error: any) {
    logMessage += ` Error during Heroku action '${action}': ${error.message}.`;
    const updatedLogs = [...(deployment.logs || []), logMessage].slice(-500);
    const currentDeploymentRecord = await deploymentsCollection.findOne({ id: deploymentId });
    if (currentDeploymentRecord) {
        await deploymentsCollection.updateOne({ id: deploymentId }, { $set: { logs: updatedLogs } });
    }
    console.error(`Error controlling Heroku deployment '${deployment.appName}':`, error);
    return { success: false, message: `Heroku API operation failed: ${error.message}` };
  }
}

export async function deleteDeployment(deploymentId: string): Promise<{ success: boolean; message: string }> {
  const user = await getLoggedInUser();
  if (!user) return { success: false, message: "Unauthorized. Please log in." };

  const db = await getDb();
  const deploymentsCollection = db.collection<Deployment>("deployments");
  const deployment = await deploymentsCollection.findOne({ id: deploymentId });

  if (!deployment) return { success: false, message: "Deployment not found in our records." };
  if (deployment.userId !== user._id && user.role !== 'admin') {
    return { success: false, message: "Unauthorized. You can only delete your own deployments." };
  }

  const herokuApiKey = await getHerokuKeyForDeployment(deployment);
  if (!herokuApiKey) {
     return { success: false, message: "Heroku API Key is not configured or resolvable. Cannot delete deployment." };
  }
  
  const timestamp = new Date().toISOString();
  const initialDbLogs = deployment.logs || [];
  let logMessage = `[SYSTEM] Info: ${timestamp} - User ${user.email} initiated deletion for deployment '${deployment.appName}' (ID: ${deployment.id}).`;
  let herokuAppDeleted = false;


  try {
    logMessage += ` Attempting to delete Heroku app '${deployment.appName}'.`;
    await herokuApiCall(`/apps/${deployment.id}`, 'DELETE', herokuApiKey);
    logMessage += ` Heroku app '${deployment.appName}' delete command accepted by Heroku.`;
    herokuAppDeleted = true;
  } catch (error: any) {
    if (error.message && error.message.includes("(Status: 404)") || (typeof error === 'object' && error !== null && 'status' in error && error.status === 404)) {
      logMessage += ` Heroku app '${deployment.appName}' not found on Heroku (Status 404). Assuming already deleted or never fully created. Proceeding with local cleanup.`;
      herokuAppDeleted = true;
    } else {
      logMessage += ` Error deleting Heroku app '${deployment.appName}': ${error.message}. Local record will NOT be deleted.`;
      const updatedLogs = [...initialDbLogs, logMessage].slice(-500);
      const currentDeploymentRecord = await deploymentsCollection.findOne({ id: deploymentId });
      if (currentDeploymentRecord) {
        await deploymentsCollection.updateOne({ id: deploymentId }, { $set: { logs: updatedLogs } });
        revalidatePath(`/dashboard/deployments/${deploymentId}`);
      }
      return { success: false, message: `Failed to delete Heroku app: ${error.message}.` };
    }
  }

  if (herokuAppDeleted) {
    try {
      const deleteResult = await deploymentsCollection.deleteOne({ id: deployment.id });
      if (deleteResult.deletedCount === 0) {
        logMessage += ` Warning: Heroku app was targeted for deletion, but local record for '${deployment.appName}' not found or already deleted.`;
        console.warn(logMessage);
      } else {
        logMessage += ` Local database record for deployment '${deployment.appName}' deleted successfully.`;
      }
      revalidatePath("/dashboard");
      revalidatePath(`/dashboard/deployments`); 
      return { success: true, message: `Deployment '${deployment.appName}' and associated Heroku app have been successfully deleted (or confirmed deleted).` };
    } catch (dbError: any) {
      logMessage += ` Critical Error: Heroku app '${deployment.appName}' was deleted (or confirmed deleted), but failed to delete local database record: ${dbError.message}. Manual cleanup may be required.`;
      console.error(logMessage);
      return { success: false, message: `Heroku app deleted, but failed to clean up local record: ${dbError.message}` };
    }
  }
  return { success: false, message: "An unknown error occurred during the deletion process." };
}


export async function analyzeDeploymentLogs(logs: string): Promise<{ success: boolean; analysis?: string; error?: string }> {
  if (!logs.trim()) {
    return { success: false, error: "Log content cannot be empty." };
  }
  try {
    const input: AnalyzeDeploymentLogsInput = { deploymentLogs: logs };
    const result = await analyzeLogsFlow(input);
    return { success: true, analysis: result.analysisResult };
  } catch (error) {
    console.error("AI Log Analysis Error:", error);
    return { success: false, error: "Failed to analyze logs. Please try again." };
  }
}

export async function updateDeploymentEnvVariables(
  deploymentId: string,
  newEnvVars: DeploymentFormInput
): Promise<{ success: boolean; message: string }> {
  const user = await getLoggedInUser();
  if (!user) {
    return { success: false, message: "Unauthorized. Please log in." };
  }

  const db = await getDb();
  const deploymentsCollection = db.collection<Deployment>("deployments");
  const deployment = await deploymentsCollection.findOne({ id: deploymentId });

  if (!deployment) {
    return { success: false, message: "Deployment not found." };
  }
  if (deployment.userId !== user._id && user.role !== 'admin') {
    return { success: false, message: "Unauthorized to modify this deployment." };
  }
  
  const herokuApiKey = await getHerokuKeyForDeployment(deployment);
  if (!herokuApiKey) {
    return { success: false, message: "Heroku API Key is not configured or resolvable for this deployment." };
  }

  const timestamp = new Date().toISOString();
  let logMessage = `[SYSTEM] Info: ${timestamp} - User ${user.email} initiated environment variable update for '${deployment.appName}'.`;

  try {
    const herokuConfigVars = { ...newEnvVars };
    if ('PLATFORM_APP_NAME' in herokuConfigVars) {
      delete (herokuConfigVars as any).PLATFORM_APP_NAME;
    }
    if (!(herokuConfigVars as any).GITHUB_REPO_URL) {
        (herokuConfigVars as any).GITHUB_REPO_URL = deployment.githubRepoUrl;
    }


    logMessage += ` Attempting to update config vars on Heroku.`;
    await herokuApiCall(`/apps/${deployment.id}/config-vars`, 'PATCH', herokuApiKey, herokuConfigVars);
    logMessage += ` Heroku config vars updated successfully.`;

    logMessage += ` Attempting to restart Heroku app '${deployment.appName}' for changes to take effect.`;
    await herokuApiCall(`/apps/${deployment.id}/dynos`, 'DELETE', herokuApiKey); 
    logMessage += ` Heroku app restart command accepted. Status set to 'deploying'.`;

    const updatedLogs = [...(deployment.logs || []), logMessage].slice(-500);
    await deploymentsCollection.updateOne(
      { id: deployment.id },
      { $set: { envVariables: newEnvVars, logs: updatedLogs, status: 'deploying', lastDeployedAt: new Date().toISOString() } }
    );

    revalidatePath(`/dashboard/deployments/${deployment.id}`);
    return { success: true, message: "Environment variables updated and app restart initiated. Status is 'deploying'." };

  } catch (error: any) {
    logMessage += ` Error during environment variable update or restart: ${error.message}.`;
    const updatedLogs = [...(deployment.logs || []), logMessage].slice(-500);
     // Only update logs if the deployment record still exists
    const currentDeploymentRecord = await deploymentsCollection.findOne({ id: deploymentId });
    if (currentDeploymentRecord) {
        await deploymentsCollection.updateOne({ id: deployment.id }, { $set: { logs: updatedLogs } });
    }
    console.error(`Error updating env variables for '${deployment.appName}':`, error);
    return { success: false, message: `Failed to update environment variables: ${error.message}` };
  }
}

// Add the missing switchDeploymentVersion function
export async function switchDeploymentVersion(
  deploymentId: string,
  newVersion: "V3" | "V4" | "V5"
): Promise<{ success: boolean; message: string }> {
  const user = await getLoggedInUser();
  if (!user) {
    return { success: false, message: "Unauthorized. Please log in." };
  }

  const db = await getDb();
  const deploymentsCollection = db.collection<Deployment>("deployments");
  const deployment = await deploymentsCollection.findOne({ id: deploymentId });

  if (!deployment) {
    return { success: false, message: "Deployment not found." };
  }

  if (deployment.userId !== user._id && user.role !== 'admin') {
    return { success: false, message: "Unauthorized to modify this deployment." };
  }

  const herokuApiKey = await getHerokuKeyForDeployment(deployment);
  if (!herokuApiKey) {
    return { success: false, message: "Heroku API Key is not configured or resolvable for this deployment." };
  }

  const timestamp = new Date().toISOString();
  const newGithubRepoUrl = `https://github.com/DavidCyrilTech/Anita-${newVersion}`;
  
  // Check if version is already the same
  const currentVersion = deployment.githubRepoUrl?.includes("Anita-") 
    ? deployment.githubRepoUrl.split("Anita-")[1] 
    : "V5";
  
  if (currentVersion === newVersion) {
    return { success: false, message: `Deployment is already using Anita-${newVersion}.` };
  }

  let logMessage = `[SYSTEM] Info: ${timestamp} - User ${user.email} initiated version switch for '${deployment.appName}'.`;
  logMessage += ` Switching from Anita-${currentVersion} to Anita-${newVersion}. New GitHub repository: ${newGithubRepoUrl}`;

  try {
    // Update the GITHUB_REPO_URL environment variable on Heroku
    logMessage += ` Updating GITHUB_REPO_URL environment variable on Heroku...`;
    await herokuApiCall(`/apps/${deployment.id}/config-vars`, 'PATCH', herokuApiKey, {
      GITHUB_REPO_URL: newGithubRepoUrl
    });
    logMessage += ` Heroku config var updated successfully.`;

    // Trigger a new build from the new repository
    logMessage += ` Triggering new build from GitHub repository '${newGithubRepoUrl}'...`;
    const build = await herokuApiCall(`/apps/${deployment.id}/builds`, 'POST', herokuApiKey, {
      source_blob: {
        url: `${newGithubRepoUrl}/tarball/main/`,
        version: 'main'
      },
    });
    logMessage += ` Heroku build initiated (ID: ${build.id}). Status set to 'deploying'.`;

    // Update deployment record in database
    const updatedLogs = [...(deployment.logs || []), logMessage].slice(-500);
    
    // Update environment variables with new githubRepoUrl
    const updatedEnvVariables = { 
      ...deployment.envVariables, 
      githubRepoUrl: newGithubRepoUrl,
      anitaVersion: newVersion
    };

    await deploymentsCollection.updateOne(
      { id: deployment.id },
      { 
        $set: { 
          envVariables: updatedEnvVariables,
          githubRepoUrl: newGithubRepoUrl,
          logs: updatedLogs, 
          status: 'deploying', 
          lastDeployedAt: new Date().toISOString() 
        } 
      }
    );

    revalidatePath(`/dashboard/deployments/${deployment.id}`);
    return { 
      success: true, 
      message: `Switched to Anita-${newVersion} and initiated redeployment. Build status: ${build.status}. Check deployment details for updates.` 
    };

  } catch (error: any) {
    logMessage += ` Error during version switch: ${error.message}.`;
    const updatedLogs = [...(deployment.logs || []), logMessage].slice(-500);
    
    // Only update logs if the deployment record still exists
    const currentDeploymentRecord = await deploymentsCollection.findOne({ id: deploymentId });
    if (currentDeploymentRecord) {
      await deploymentsCollection.updateOne({ id: deployment.id }, { $set: { logs: updatedLogs } });
    }
    
    console.error(`Error switching version for '${deployment.appName}':`, error);
    return { success: false, message: `Failed to switch version: ${error.message}` };
  }
}