
import { Client, Account, Databases, Avatars } from 'appwrite';

// --- IMPORTANT: Appwrite Configuration & CORS ---
// **If you see "Failed to fetch" errors in the browser console, the MOST LIKELY cause is CORS.**
// Ensure your Appwrite project has your frontend domain added as a Platform.
//
// 1. Go to your Appwrite Console -> Project -> Settings -> Platforms.
// 2. Click "Add Platform" -> "New Web App".
// 3. Enter a name (e.g., "Ekonova Web App").
// 4. In the "Hostname" field, enter the domain where your Next.js app is running.
//    - For local development (like in Firebase Studio/IDX), this might be a specific URL provided by the environment (e.g., *.cluster-xyz.cloudworkstations.dev) or just 'localhost' if running locally without a proxy. Check your browser's address bar. Add 'localhost' if needed.
//    - For deployed apps, enter your production domain (e.g., your-app.com).
// 5. Click "Create".
//
// Missing or incorrect platforms WILL cause CORS errors, blocking requests from the browser.
// -----------------------------------------------

// Ensure NEXT_PUBLIC_ prefix is used for client-side accessible vars
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
export const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
export const boardsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_BOARDS_COLLECTION_ID!;
export const billsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_BILLS_COLLECTION_ID!;

// Check if essential variables are present and not just placeholder values
// Basic check - refine if specific placeholder patterns are known
const configOk = !!endpoint &&
                 !endpoint.includes('YOUR_APPWRITE_ENDPOINT') && // Avoid example placeholder
                 !!projectId &&
                 !projectId.includes('YOUR_PROJECT_ID') && // Avoid example placeholder
                 !!databaseId &&
                 !databaseId.includes('YOUR_DATABASE_ID') && // Avoid example placeholder
                 !!boardsCollectionId &&
                 !boardsCollectionId.includes('YOUR_BOARDS_COLLECTION_ID') && // Avoid example placeholder
                 !!billsCollectionId &&
                 !billsCollectionId.includes('YOUR_BILLS_COLLECTION_ID'); // Avoid example placeholder


const client = new Client();

// Configure client only if configuration seems okay
if (configOk) {
    try {
        client
          .setEndpoint(endpoint!) // Use non-null assertion as configOk implies they exist
          .setProject(projectId!);
    } catch (error) {
         console.error("Error configuring Appwrite client during initialization:", error);
         // Potentially re-set configOk to false or handle differently
    }
} else {
    // Log a more specific configuration issue notice if configuration failed
    console.error(
        "Appwrite client configuration failed. " +
        "Please check your .env file for correct NEXT_PUBLIC_ prefixed Appwrite " +
        "endpoint, project ID, database ID, and collection IDs. " +
        "Ensure they are not placeholder values like 'YOUR_...'. " +
        "Also, ensure the .env file is correctly loaded (e.g., restart the Next.js server after changes)."
    );
    // Optional: Throw an error to halt execution if config is absolutely required
    // throw new Error("Appwrite client not configured. Check environment variables.");
}

const account = new Account(client);
const databases = new Databases(client);
const avatars = new Avatars(client);

// Export configOk if it needs to be checked elsewhere (e.g., conditionally render UI)
export { client, account, databases, avatars, configOk };
