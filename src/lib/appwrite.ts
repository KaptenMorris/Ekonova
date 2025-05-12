import { Client, Account, Databases, Avatars } from 'appwrite';

// --- IMPORTANT: Appwrite Configuration & CORS ---
// Ensure your Appwrite project has your frontend domain added as a Platform.
// For local development, this might be 'localhost'. For deployed apps, it's your domain.
// Missing or incorrect platforms will cause CORS errors, often showing as "Failed to fetch" in the browser console.
// Go to your Appwrite Console -> Project -> Settings -> Platforms -> Add Platform (Web)
// -----------------------------------------------

// Ensure NEXT_PUBLIC_ prefix is used for client-side accessible vars
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
export const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
export const boardsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_BOARDS_COLLECTION_ID!;
export const billsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_BILLS_COLLECTION_ID!;

// Check if essential variables are present and not just placeholder values
const configOk = !!endpoint &&
                 endpoint !== 'YOUR_APPWRITE_ENDPOINT' && // Example placeholder check
                 !!projectId &&
                 projectId !== 'YOUR_PROJECT_ID' && // Example placeholder check
                 !!databaseId &&
                 databaseId !== 'YOUR_DATABASE_ID' && // Example placeholder check
                 !!boardsCollectionId &&
                 boardsCollectionId !== 'YOUR_BOARDS_COLLECTION_ID' && // Example placeholder check
                 !!billsCollectionId &&
                 billsCollectionId !== 'YOUR_BILLS_COLLECTION_ID'; // Example placeholder check

const client = new Client();

// Configure client only if configuration seems okay
if (configOk) {
    try {
        client
          .setEndpoint(endpoint) // Use non-null assertion as configOk implies they exist
          .setProject(projectId);
    } catch (error) {
         console.error("Error configuring Appwrite client:", error);
         // Potentially re-set configOk to false or handle differently
    }
} else {
    // Log a more specific configuration issue notice if configuration failed
    console.error(
        "Appwrite client configuration failed. " +
        "Please check your .env.local file for correct NEXT_PUBLIC_ prefixed Appwrite " +
        "endpoint, project ID, database ID, and collection IDs. " +
        "Ensure they are not placeholder values."
    );
    // Optional: Throw an error to halt execution if config is absolutely required
    // throw new Error("Appwrite client not configured. Check environment variables.");
}

const account = new Account(client);
const databases = new Databases(client);
const avatars = new Avatars(client);

// Export configOk if it needs to be checked elsewhere (e.g., conditionally render UI)
export { client, account, databases, avatars, configOk };
