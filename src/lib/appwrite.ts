import { Client, Account, Databases, Avatars } from 'appwrite';

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
export const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
export const boardsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_BOARDS_COLLECTION_ID!;
export const billsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_BILLS_COLLECTION_ID!;


// Helper to check for placeholder values
const isPlaceholder = (value: string | undefined, placeholder: string) => !value || value === placeholder;

// Check for missing or placeholder values and log warnings
if (isPlaceholder(endpoint, 'YOUR_APPWRITE_ENDPOINT_URL') || isPlaceholder(endpoint, 'https://cloud.appwrite.io/v1')) { // Check common placeholders
  console.warn(`WARNING: NEXT_PUBLIC_APPWRITE_ENDPOINT is not set correctly in your .env.local file. Using placeholder: ${endpoint}. Update it with your actual Appwrite endpoint.`);
}
if (isPlaceholder(projectId, 'YOUR_PROJECT_ID')) {
  console.warn("WARNING: NEXT_PUBLIC_APPWRITE_PROJECT_ID is not set correctly in your .env.local file. Using placeholder. Update it with your actual Appwrite project ID.");
}
if (isPlaceholder(databaseId, 'YOUR_DATABASE_ID')) {
    console.warn("WARNING: NEXT_PUBLIC_APPWRITE_DATABASE_ID is not set correctly in your .env.local file. Update it.");
}
if (isPlaceholder(boardsCollectionId, 'YOUR_BOARDS_COLLECTION_ID')) {
    console.warn("WARNING: NEXT_PUBLIC_APPWRITE_BOARDS_COLLECTION_ID is not set correctly in your .env.local file. Update it.");
}
if (isPlaceholder(billsCollectionId, 'YOUR_BILLS_COLLECTION_ID')) {
    console.warn("WARNING: NEXT_PUBLIC_APPWRITE_BILLS_COLLECTION_ID is not set correctly in your .env.local file. Update it.");
}


const client = new Client();

// Configure client only if endpoint and project ID seem valid (not missing/placeholders)
if (endpoint && projectId && !isPlaceholder(endpoint, 'YOUR_APPWRITE_ENDPOINT_URL') && !isPlaceholder(endpoint, 'https://cloud.appwrite.io/v1') && !isPlaceholder(projectId, 'YOUR_PROJECT_ID')) {
    client
      .setEndpoint(endpoint)
      .setProject(projectId);
} else {
    // Log a general configuration issue notice if configuration failed
    console.error("Appwrite client configuration failed. Please check your .env.local file for correct Appwrite endpoint and project ID.");
    // You might want to throw an error here in production if config is mandatory
    // throw new Error("Appwrite client not configured.");
}


const account = new Account(client);
const databases = new Databases(client);
const avatars = new Avatars(client);

export { client, account, databases, avatars };
