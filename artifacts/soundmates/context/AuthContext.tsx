import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  query,
  collection,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

// We store users in Firebase Auth using a synthetic email: username@soundmates.app
// This ensures username uniqueness at the auth level and avoids exposing real emails.
const toEmail = (username: string) => `${username.toLowerCase().trim()}@soundmates.app`;

interface UserProfile {
  uid: string;
  username: string;
  photoURL?: string;
  lastfmUsername?: string;
  createdAt: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (username: string, password: string) => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  updateLastfmUsername: (username: string) => Promise<void>;
  disconnectLastfm: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Holds the profile during signup to avoid a race condition:
  // createUserWithEmailAndPassword triggers onAuthStateChanged before
  // the Firestore profile document is written, causing AuthGate to
  // redirect to create-username. We pre-load the profile here instead.
  const pendingProfile = useRef<UserProfile | null>(null);

  const fetchProfile = async (uid: string) => {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
    } catch (error) {
      console.error("[Auth] Error fetching profile:", error);
      setProfile(null);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Use the pending profile (set during signup) to avoid the race
        // condition where Firestore hasn't written the doc yet.
        if (pendingProfile.current?.uid === firebaseUser.uid) {
          setProfile(pendingProfile.current);
          pendingProfile.current = null;
        } else {
          await fetchProfile(firebaseUser.uid);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signUp = async (username: string, password: string) => {
    const trimmed = username.trim().toLowerCase();

    // Validate format
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      throw new Error("Username can only contain letters, numbers, and underscores.");
    }

    // Build the profile object (we need it before creating the auth user
    // so we can pre-load it into pendingProfile to prevent a race condition
    // with onAuthStateChanged).
    const userProfile: UserProfile = {
      uid: "", // placeholder — filled in after auth creation
      username: trimmed,
      createdAt: Date.now(),
    };

    // 1. Pre-set pendingProfile so onAuthStateChanged uses it immediately
    //    instead of fetching from Firestore (which has no doc yet).
    pendingProfile.current = userProfile;

    try {
      // 2. Create Firebase Auth user (triggers onAuthStateChanged)
      const { user: newUser } = await createUserWithEmailAndPassword(auth, toEmail(trimmed), password);
      userProfile.uid = newUser.uid;
      pendingProfile.current = userProfile; // update with real UID

      // 3. Check username uniqueness (now authenticated)
      const q = query(collection(db, "users"), where("username", "==", trimmed));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await newUser.delete();
        setProfile(null);
        pendingProfile.current = null;
        throw new Error("Username is already taken. Please choose another.");
      }

      // 4. Write Firestore profile
      await setDoc(doc(db, "users", newUser.uid), userProfile);
      setProfile(userProfile);
    } catch (e) {
      pendingProfile.current = null;
      // If auth user was created, clean it up
      const currentUser = auth.currentUser;
      if (currentUser) await currentUser.delete().catch(() => {});
      throw e;
    }
  };

  const signIn = async (username: string, password: string) => {
    const trimmed = username.trim().toLowerCase();
    await signInWithEmailAndPassword(auth, toEmail(trimmed), password);
  };

  const logOut = async () => {
    await signOut(auth);
    setProfile(null);
  };

  const updateLastfmUsername = async (lastfmUsername: string) => {
    if (!user) throw new Error("Not authenticated");
    const updates = { lastfmUsername };
    await setDoc(doc(db, "users", user.uid), updates, { merge: true });
    setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const disconnectLastfm = async () => {
    if (!user) throw new Error("Not authenticated");
    const updates = { lastfmUsername: "" };
    await setDoc(doc(db, "users", user.uid), updates, { merge: true });
    setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.uid);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signUp,
        signIn,
        logOut,
        updateLastfmUsername,
        disconnectLastfm,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
