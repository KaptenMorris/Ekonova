import { Client, Account, Databases, Avatars } from 'appwrite';

// Ensure NEXT_PUBLIC_ prefix is used for client-side accessible vars
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
export const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
export const boardsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_BOARDS_COLLECTION_ID!;
export const billsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_BILLS_COLLECTION_ID!;

// Basic check if essential variables are present
const configOk = !!endpoint && !!projectId && !!databaseId && !!boardsCollectionId && !!billsCollectionId;

if (!configOk) {
  console.error("One or more Appwrite environment variables (NEXT_PUBLIC_...) are missing in your .env.local file. Please ensure they are set correctly.");
  // Depending on the desired behavior, you might want to throw an error here
  // to prevent the app from running with invalid configuration.
  // throw new Error("Appwrite environment variables are not configured properly.");
}

const client = new Client();

// Configure client only if configuration seems okay
// The Appwrite SDK might still throw errors later if the values are invalid
if (configOk) {
    client
      .setEndpoint(endpoint) // Use non-null assertion as configOk implies they exist
      .setProject(projectId);
} else {
     // Client remains unconfigured, SDK calls will likely fail.
     console.warn("Appwrite client is not configured due to missing environment variables.");
}


const account = new Account(client);
const databases = new Databases(client);
const avatars = new Avatars(client);

// Export configOk if it needs to be checked elsewhere (e.g., conditionally render UI)
export { client, account, databases, avatars, configOk };
