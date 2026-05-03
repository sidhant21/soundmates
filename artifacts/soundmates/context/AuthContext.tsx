import React, { createContext, useContext, useEffect, useState } from "react";
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

interface UserProfile {
  uid: string;
  email: string;
  username: string;
  photoURL?: string;
  lastfmUsername?: string;
  createdAt: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  createUsername: (username: string) => Promise<void>;
  updateLastfmUsername: (username: string) => Promise<void>;
  disconnectLastfm: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    const docRef = doc(db, "users", uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      setProfile(snap.data() as UserProfile);
    } else {
      setProfile(null);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchProfile(firebaseUser.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logOut = async () => {
    await signOut(auth);
    setProfile(null);
  };

  const createUsername = async (username: string) => {
    if (!user) throw new Error("Not authenticated");
    const trimmed = username.trim().toLowerCase();

    // Check uniqueness
    const q = query(collection(db, "users"), where("username", "==", trimmed));
    const snap = await getDocs(q);
    if (!snap.empty) throw new Error("Username already taken");

    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email!,
      username: trimmed,

      createdAt: Date.now(),
    };

    await setDoc(doc(db, "users", user.uid), userProfile);
    setProfile(userProfile);
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
        createUsername,
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
