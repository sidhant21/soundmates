import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface FriendRequest {
  id: string;
  fromUid: string;
  fromUsername: string;
  toUid: string;
  toUsername: string;
  status: "pending";
  createdAt: number;
}

export interface Friendship {
  id: string;
  uid1: string;
  uid2: string;
  createdAt: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  spotifyConnected: boolean;
  spotifyAccessToken?: string;
  spotifyRefreshToken?: string;
  spotifyTokenExpiry?: number;
  createdAt: number;
}

// Search users by username prefix
export async function searchUsers(searchTerm: string, currentUid: string): Promise<UserProfile[]> {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return [];
  const q = query(collection(db, "users"), where("username", ">=", term), where("username", "<=", term + "\uf8ff"));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => d.data() as UserProfile)
    .filter((u) => u.uid !== currentUid);
}

// Send a friend request
export async function sendFriendRequest(
  fromUid: string,
  fromUsername: string,
  toUid: string,
  toUsername: string
): Promise<void> {
  // Check not already sent
  const existing = await getPendingRequestBetween(fromUid, toUid);
  if (existing) throw new Error("Friend request already sent");
  const alreadyFriends = await checkFriendship(fromUid, toUid);
  if (alreadyFriends) throw new Error("Already friends");

  await addDoc(collection(db, "friend_requests"), {
    fromUid,
    fromUsername,
    toUid,
    toUsername,
    status: "pending",
    createdAt: Date.now(),
  });
}

// Get incoming pending requests for a user
export async function getIncomingRequests(uid: string): Promise<FriendRequest[]> {
  const q = query(collection(db, "friend_requests"), where("toUid", "==", uid), where("status", "==", "pending"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FriendRequest));
}

// Get outgoing pending requests from a user
export async function getOutgoingRequests(uid: string): Promise<FriendRequest[]> {
  const q = query(collection(db, "friend_requests"), where("fromUid", "==", uid), where("status", "==", "pending"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FriendRequest));
}

// Get a pending request between two users (either direction)
export async function getPendingRequestBetween(uid1: string, uid2: string): Promise<FriendRequest | null> {
  const q1 = query(collection(db, "friend_requests"), where("fromUid", "==", uid1), where("toUid", "==", uid2), where("status", "==", "pending"));
  const snap1 = await getDocs(q1);
  if (!snap1.empty) return { id: snap1.docs[0].id, ...snap1.docs[0].data() } as FriendRequest;

  const q2 = query(collection(db, "friend_requests"), where("fromUid", "==", uid2), where("toUid", "==", uid1), where("status", "==", "pending"));
  const snap2 = await getDocs(q2);
  if (!snap2.empty) return { id: snap2.docs[0].id, ...snap2.docs[0].data() } as FriendRequest;

  return null;
}

// Accept a friend request
export async function acceptFriendRequest(request: FriendRequest): Promise<void> {
  // Create friendship
  await addDoc(collection(db, "friendships"), {
    uid1: request.fromUid,
    uid2: request.toUid,
    createdAt: Date.now(),
  });
  // Delete the request
  await deleteDoc(doc(db, "friend_requests", request.id));
}

// Decline / cancel a friend request
export async function declineOrCancelRequest(requestId: string): Promise<void> {
  await deleteDoc(doc(db, "friend_requests", requestId));
}

// Check if two users are friends
export async function checkFriendship(uid1: string, uid2: string): Promise<boolean> {
  const q1 = query(collection(db, "friendships"), where("uid1", "==", uid1), where("uid2", "==", uid2));
  const snap1 = await getDocs(q1);
  if (!snap1.empty) return true;

  const q2 = query(collection(db, "friendships"), where("uid1", "==", uid2), where("uid2", "==", uid1));
  const snap2 = await getDocs(q2);
  return !snap2.empty;
}

// Remove a friendship
export async function removeFriend(uid1: string, uid2: string): Promise<void> {
  const q1 = query(collection(db, "friendships"), where("uid1", "==", uid1), where("uid2", "==", uid2));
  const snap1 = await getDocs(q1);
  for (const d of snap1.docs) await deleteDoc(d.ref);

  const q2 = query(collection(db, "friendships"), where("uid1", "==", uid2), where("uid2", "==", uid1));
  const snap2 = await getDocs(q2);
  for (const d of snap2.docs) await deleteDoc(d.ref);
}

// Get all friends of a user (returns their UIDs)
export async function getFriendUids(uid: string): Promise<string[]> {
  const q1 = query(collection(db, "friendships"), where("uid1", "==", uid));
  const q2 = query(collection(db, "friendships"), where("uid2", "==", uid));
  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const uids: string[] = [];
  snap1.docs.forEach((d) => uids.push(d.data().uid2));
  snap2.docs.forEach((d) => uids.push(d.data().uid1));
  return uids;
}

// Get user profile by UID
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

// Get multiple user profiles by UIDs
export async function getUserProfiles(uids: string[]): Promise<UserProfile[]> {
  if (!uids.length) return [];
  const profiles = await Promise.all(uids.map(getUserProfile));
  return profiles.filter(Boolean) as UserProfile[];
}
