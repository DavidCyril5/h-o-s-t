
import { MongoClient, ServerApiVersion, type Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://davidcyril:85200555@david.sgk9dsd.mongodb.net/?retryWrites=true&w=majority&appName=David";

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable.'
  );
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

let globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>
}

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(MONGODB_URI, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        }
      });
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
   client = new MongoClient(MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });
  clientPromise = client.connect();
}


export async function getDb(): Promise<Db> {
  const mongoClient = await clientPromise;
  
  const uriParts = MONGODB_URI.split('/');
  const dbNameFromUriCandidate = uriParts[uriParts.length - 1];
  const dbName = (dbNameFromUriCandidate && !dbNameFromUriCandidate.includes("?")) ? dbNameFromUriCandidate.split('?')[0] : 'anitaDeployDB';
  
  return mongoClient.db(dbName);
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;
