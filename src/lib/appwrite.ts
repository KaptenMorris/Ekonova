import { Client, Account, Databases, Avatars } from 'appwrite';

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
export const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
export const boardsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_BOARDS_COLLECTION_ID!;
export const billsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_BILLS_COLLECTION_ID!;

// Helper to check for missing, empty, or placeholder values
const isMissingOrPlaceholder = (value: string | undefined | null, placeholders: string[]) =>
  !value || value.trim() === '' || placeholders.some(p => value === p);

// Define placeholders to check against
const endpointPlaceholders = ['YOUR_APPWRITE_ENDPOINT_URL', 'https://cloud.appwrite.io/v1']; // Including default cloud URL might indicate lack of specific config
const projectIdPlaceholders = ['YOUR_PROJECT_ID'];
const databaseIdPlaceholders = ['YOUR_DATABASE_ID'];
const boardsCollectionIdPlaceholders = ['YOUR_BOARDS_COLLECTION_ID'];
const billsCollectionIdPlaceholders = ['YOUR_BILLS_COLLECTION_ID'];

let configOk = true;
const missingVars: string[] = [];

// Check each variable
if (isMissingOrPlaceholder(endpoint, endpointPlaceholders)) {
  missingVars.push('NEXT_PUBLIC_APPWRITE_ENDPOINT');
  configOk = false;
}
if (isMissingOrPlaceholder(projectId, projectIdPlaceholders)) {
  missingVars.push('NEXT_PUBLIC_APPWRITE_PROJECT_ID');
  configOk = false;
}
if (isMissingOrPlaceholder(databaseId, databaseIdPlaceholders)) {
  missingVars.push('NEXT_PUBLIC_APPWRITE_DATABASE_ID');
  configOk = false;
}
if (isMissingOrPlaceholder(boardsCollectionId, boardsCollectionIdPlaceholders)) {
  missingVars.push('NEXT_PUBLIC_APPWRITE_BOARDS_COLLECTION_ID');
  configOk = false;
}
if (isMissingOrPlaceholder(billsCollectionId, billsCollectionIdPlaceholders)) {
  missingVars.push('NEXT_PUBLIC_APPWRITE_BILLS_COLLECTION_ID');
  configOk = false;
}

const client = new Client();

// Configure client only if all required variables are present and seem valid
if (configOk) {
    client
      .setEndpoint(endpoint!) // Use non-null assertion as configOk ensures they are defined
      .setProject(projectId!);
} else {
    // Log a detailed error message listing the problematic variables
    console.error(`Appwrite client configuration failed. Please check your .env.local file and ensure the following environment variables are set correctly and do not contain placeholder values: ${missingVars.join(', ')}.`);
    // Optional: Throw an error to halt execution if config is absolutely required, especially in production builds
    // throw new Error("Appwrite client not configured. Check environment variables.");
}

// Initialize Appwrite services regardless of config success,
// but operations will fail if the client isn't configured.
const account = new Account(client);
const databases = new Databases(client);
const avatars = new Avatars(client);

export { client, account, databases, avatars, configOk }; // Export configOk if needed elsewhere
