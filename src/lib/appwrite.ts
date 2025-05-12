import { Client, Account, Databases, Avatars } from 'appwrite';

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

// // Warning if variables are not set or are placeholders
// if (!endpoint || endpoint === 'YOUR_APPWRITE_ENDPOINT_URL' || endpoint === 'https://YOUR_APPWRITE_ENDPOINT/v1') {
//   console.warn("WARNING: NEXT_PUBLIC_APPWRITE_ENDPOINT is not set or is still the placeholder value in the .env file. Please update it with your actual Appwrite endpoint for the app to function correctly.");
// }
// if (!projectId || projectId === 'YOUR_PROJECT_ID') {
//   console.warn("WARNING: NEXT_PUBLIC_APPWRITE_PROJECT_ID is not set or is still the placeholder value in the .env file. Please update it with your actual Appwrite project ID.");
// }

const client = new Client();

if (endpoint && projectId && endpoint !== 'YOUR_APPWRITE_ENDPOINT_URL' && endpoint !== 'https://YOUR_APPWRITE_ENDPOINT/v1' && projectId !== 'YOUR_PROJECT_ID') {
    client
      .setEndpoint(endpoint)
      .setProject(projectId);
} else {
    // Log error only if variables are truly missing, not just placeholders during initial setup.
    if(!endpoint || !projectId) {
        console.error("Appwrite client not configured due to missing environment variables.");
    }
    // Allow placeholder values without console error, relying on .env comments and potential runtime errors if not replaced.
}


const account = new Account(client);
const databases = new Databases(client);
const avatars = new Avatars(client);

// Ensure exclamation marks are used carefully, consider adding checks or default values if necessary
export const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
export const boardsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_BOARDS_COLLECTION_ID!;
export const billsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_BILLS_COLLECTION_ID!;

// if (!databaseId || databaseId === 'YOUR_DATABASE_ID') {
//     console.warn("WARNING: NEXT_PUBLIC_APPWRITE_DATABASE_ID is not set or is still the placeholder value in the .env file. Please update it.");
// }
// if (!boardsCollectionId || boardsCollectionId === 'YOUR_BOARDS_COLLECTION_ID') {
//     console.warn("WARNING: NEXT_PUBLIC_APPWRITE_BOARDS_COLLECTION_ID is not set or is still the placeholder value in the .env file. Please update it.");
// }
// if (!billsCollectionId || billsCollectionId === 'YOUR_BILLS_COLLECTION_ID') {
//     console.warn("WARNING: NEXT_PUBLIC_APPWRITE_BILLS_COLLECTION_ID is not set or is still the placeholder value in the .env file. Please update it.");
// }


export { client, account, databases, avatars };
