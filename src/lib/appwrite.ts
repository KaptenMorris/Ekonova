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
// Also ensure environment variables in .env.local are correct and you've RESTARTED the Next.js server.
// -----------------------------------------------

// Ensure NEXT_PUBLIC_ prefix is used for client-side accessible vars
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
export const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
export const boardsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_BOARDS_COLLECTION_ID!;
export const billsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_BILLS_COLLECTION_ID!;

// Improved check: ensure variables are defined, not empty strings, and not placeholders
const isPlaceholder = (value: string | undefined, placeholderPrefix: string) => {
  return !value || value.trim() === '' || value.includes(placeholderPrefix);
}

const configOk = !isPlaceholder(endpoint, 'YOUR_APPWRITE_ENDPOINT') &&
                 !isPlaceholder(projectId, 'YOUR_PROJECT_ID') &&
                 !isPlaceholder(databaseId, 'YOUR_DATABASE_ID') &&
                 !isPlaceholder(boardsCollectionId, 'YOUR_BOARDS_COLLECTION_ID') &&
                 !isPlaceholder(billsCollectionId, 'YOUR_BILLS_COLLECTION_ID');


const client = new Client();

// Configure client only if configuration seems okay
if (configOk) {
    try {
        client
          .setEndpoint(endpoint!) // Use non-null assertion as configOk implies they exist
          .setProject(projectId!);
        console.log("Appwrite client configured successfully."); // Log success
    } catch (error) {
         console.error("CRITICAL: Error configuring Appwrite client during initialization:", error);
         // Potentially re-set configOk to false or handle differently
         // configOk = false; // Consider setting to false if init fails
    }
} else {
    // Log a more specific configuration issue notice if configuration failed
    console.error(
        "CRITICAL: Appwrite client configuration failed. " +
        "One or more NEXT_PUBLIC_ environment variables in .env.local are missing, empty, or still contain placeholder values (like 'YOUR_...').\n" +
        ` - Endpoint: ${endpoint ? 'OK' : 'MISSING/EMPTY'}\n` +
        ` - Project ID: ${projectId ? 'OK' : 'MISSING/EMPTY'}\n` +
        ` - Database ID: ${databaseId ? 'OK' : 'MISSING/EMPTY'}\n` +
        ` - Boards Collection ID: ${boardsCollectionId ? 'OK' : 'MISSING/EMPTY'}\n` +
        ` - Bills Collection ID: ${billsCollectionId ? 'OK' : 'MISSING/EMPTY'}\n` +
        "Please correct the .env.local file and RESTART the Next.js server."
    );
    // Optional: Throw an error to halt execution if config is absolutely required
    // throw new Error("Appwrite client not configured. Check environment variables.");
}

const account = new Account(client);
const databases = new Databases(client);
const avatars = new Avatars(client);

// Export configOk if it needs to be checked elsewhere (e.g., conditionally render UI)
export { client, account, databases, avatars, configOk };