import { Client, Account, Databases, Avatars } from 'appwrite';

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
export const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
export const boardsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_BOARDS_COLLECTION_ID!;
export const billsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_BILLS_COLLECTION_ID!;

// Helper to check for missing or placeholder values
const isMissingOrPlaceholder = (value: string | undefined, placeholders: string[]) =>
  !value || placeholders.some(p => value === p);

// Define placeholders to check against
const endpointPlaceholders = ['YOUR_APPWRITE_ENDPOINT_URL', 'https://cloud.appwrite.io/v1']; // Including the default cloud URL as a potential *unconfigured* state
const projectIdPlaceholders = ['YOUR_PROJECT_ID'];
const databaseIdPlaceholders = ['YOUR_DATABASE_ID'];
const boardsCollectionIdPlaceholders = ['YOUR_BOARDS_COLLECTION_ID'];
const billsCollectionIdPlaceholders = ['YOUR_BILLS_COLLECTION_ID'];

let configOk = true;

// Check for missing or placeholder values and log warnings
if (isMissingOrPlaceholder(endpoint, endpointPlaceholders)) {
  console.warn(`WARNING: NEXT_PUBLIC_APPWRITE_ENDPOINT is not set correctly or is a placeholder in your .env.local file. Value: "${endpoint}". Update it with your actual Appwrite endpoint.`);
  configOk = false;
}
if (isMissingOrPlaceholder(projectId, projectIdPlaceholders)) {
  console.warn(`WARNING: NEXT_PUBLIC_APPWRITE_PROJECT_ID is not set correctly or is a placeholder in your .env.local file. Value: "${projectId}". Update it with your actual Appwrite project ID.`);
  configOk = false;
}
if (isMissingOrPlaceholder(databaseId, databaseIdPlaceholders)) {
    console.warn(`WARNING: NEXT_PUBLIC_APPWRITE_DATABASE_ID is not set correctly or is a placeholder in your .env.local file. Value: "${databaseId}". Update it.`);
    configOk = false;
}
if (isMissingOrPlaceholder(boardsCollectionId, boardsCollectionIdPlaceholders)) {
    console.warn(`WARNING: NEXT_PUBLIC_APPWRITE_BOARDS_COLLECTION_ID is not set correctly or is a placeholder in your .env.local file. Value: "${boardsCollectionId}". Update it.`);
    configOk = false;
}
if (isMissingOrPlaceholder(billsCollectionId, billsCollectionIdPlaceholders)) {
    console.warn(`WARNING: NEXT_PUBLIC_APPWRITE_BILLS_COLLECTION_ID is not set correctly or is a placeholder in your .env.local file. Value: "${billsCollectionId}". Update it.`);
    configOk = false;
}


const client = new Client();

// Configure client only if endpoint and project ID seem valid
if (configOk && endpoint && projectId) { // Added configOk check
    client
      .setEndpoint(endpoint)
      .setProject(projectId);
} else {
    // Log a general configuration issue notice if configuration failed
    console.error("Appwrite client configuration failed. Please check your .env.local file for correct NEXT_PUBLIC_ prefixed Appwrite endpoint, project ID, database ID, and collection IDs.");
    // Optional: Throw an error to halt execution if config is absolutely required
    // throw new Error("Appwrite client not configured. Check environment variables.");
}


const account = new Account(client);
const databases = new Databases(client);
const avatars = new Avatars(client);

export { client, account, databases, avatars };
