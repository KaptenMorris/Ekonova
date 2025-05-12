
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
// API Key should NOT be prefixed with NEXT_PUBLIC_ and should only be used server-side if needed.
// For client-side operations (auth, database CRUD for user's own data), API key is usually not required.
// const apiKey = process.env.APPWRITE_API_KEY_SECRET; // Example if used server-side

// Improved check: ensure variables are defined, not empty strings, and not placeholders
const isPlaceholder = (value: string | undefined, placeholderPrefix: string) => {
  // Check if value is undefined, null, empty, or contains a known placeholder pattern.
  // Common placeholder patterns start with "YOUR_" or are "<...>"
  return !value || value.trim() === '' || value.startsWith(placeholderPrefix) || /<[^>]+>/.test(value);
}

// More robust check for placeholder values, specific to typical Appwrite placeholder formats
const checkAppwriteVar = (value: string | undefined, varName: string) => {
    if (!value || value.trim() === '' || value.includes(`YOUR_${varName.toUpperCase()}`) || value.includes(`<YOUR_`) || value.includes(`[YOUR_`)) {
        return false;
    }
    // Check for common Appwrite ID patterns if it's an ID field
    if (varName.includes('ID') && value.length < 5) { // Appwrite IDs are usually longer
        // This is a heuristic, might need adjustment
        // console.warn(`Appwrite variable ${varName} ('${value}') seems too short for a typical ID.`);
        // return false; // Decided against making this a hard fail, but it's a flag.
    }
    return true;
};


const configOk =
    checkAppwriteVar(endpoint, 'APPWRITE_ENDPOINT') &&
    checkAppwriteVar(projectId, 'APPWRITE_PROJECT_ID') &&
    checkAppwriteVar(databaseId, 'APPWRITE_DATABASE_ID') &&
    checkAppwriteVar(boardsCollectionId, 'APPWRITE_BOARDS_COLLECTION_ID') &&
    checkAppwriteVar(billsCollectionId, 'APPWRITE_BILLS_COLLECTION_ID');


const client = new Client();

if (configOk) {
    try {
        client
          .setEndpoint(endpoint!) 
          .setProject(projectId!);
        console.log(`Appwrite client configured successfully for project: '${projectId}' at endpoint: '${endpoint}'`);
    } catch (error) {
         console.error("CRITICAL: Error configuring Appwrite client during initialization (post-configOk check):", error);
    }
} else {
    console.error(
        "CRITICAL: Appwrite client configuration failed. " +
        "One or more NEXT_PUBLIC_ environment variables in .env.local are missing, empty, or still contain placeholder values.\n" +
        ` - NEXT_PUBLIC_APPWRITE_ENDPOINT: '${endpoint || "MISSING/EMPTY"}' (Status: ${checkAppwriteVar(endpoint, 'APPWRITE_ENDPOINT') ? 'OK-ish Syntax' : 'FAIL - Placeholder/Missing'})\n` +
        ` - NEXT_PUBLIC_APPWRITE_PROJECT_ID: '${projectId || "MISSING/EMPTY"}' (Status: ${checkAppwriteVar(projectId, 'APPWRITE_PROJECT_ID') ? 'OK-ish Syntax' : 'FAIL - Placeholder/Missing'})\n` +
        ` - NEXT_PUBLIC_APPWRITE_DATABASE_ID: '${databaseId || "MISSING/EMPTY"}' (Status: ${checkAppwriteVar(databaseId, 'APPWRITE_DATABASE_ID') ? 'OK-ish Syntax' : 'FAIL - Placeholder/Missing'})\n` +
        ` - NEXT_PUBLIC_APPWRITE_BOARDS_COLLECTION_ID: '${boardsCollectionId || "MISSING/EMPTY"}' (Status: ${checkAppwriteVar(boardsCollectionId, 'APPWRITE_BOARDS_COLLECTION_ID') ? 'OK-ish Syntax' : 'FAIL - Placeholder/Missing'})\n` +
        ` - NEXT_PUBLIC_APPWRITE_BILLS_COLLECTION_ID: '${billsCollectionId || "MISSING/EMPTY"}' (Status: ${checkAppwriteVar(billsCollectionId, 'APPWRITE_BILLS_COLLECTION_ID') ? 'OK-ish Syntax' : 'FAIL - Placeholder/Missing'})\n` +
        "ACTION REQUIRED: Please correct the .env.local file and RESTART the Next.js server. Then, ensure Appwrite project's Platform hostnames (CORS) are correctly set."
    );
}

const account = new Account(client);
const databases = new Databases(client);
const avatars = new Avatars(client);

export { client, account, databases, avatars, configOk };
