import { Client, Account, Databases, Avatars } from 'appwrite';

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

if (!endpoint) {
  throw new Error("NEXT_PUBLIC_APPWRITE_ENDPOINT is not set in environment variables.");
}
if (!projectId) {
  throw new Error("NEXT_PUBLIC_APPWRITE_PROJECT_ID is not set in environment variables.");
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId);

const account = new Account(client);
const databases = new Databases(client);
const avatars = new Avatars(client);

export const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
export const boardsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_BOARDS_COLLECTION_ID!;
export const billsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_BILLS_COLLECTION_ID!;

if (!databaseId) {
    throw new Error("NEXT_PUBLIC_APPWRITE_DATABASE_ID is not set");
}
if (!boardsCollectionId) {
    throw new Error("NEXT_PUBLIC_APPWRITE_BOARDS_COLLECTION_ID is not set");
}
if (!billsCollectionId) {
    throw new Error("NEXT_PUBLIC_APPWRITE_BILLS_COLLECTION_ID is not set");
}


export { client, account, databases, avatars };
