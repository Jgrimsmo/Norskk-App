"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { create, getById, update } from "@/lib/firebase/firestore";
import { Collections } from "@/lib/firebase/collections";
import type { Employee } from "@/lib/types/time-tracking";

// Admin email — this account always gets Admin role
const ADMIN_EMAIL = "norskk.earthworks@gmail.com";

// ── Types ──
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

// ── Context ──
const AuthContext = createContext<AuthContextValue | null>(null);

// ── Hook ──
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

// ── Provider ──
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      // Ensure every authenticated user has an employee record
      if (firebaseUser) {
        try {
          const existing = await getById<Employee>(
            Collections.EMPLOYEES,
            firebaseUser.uid
          );
          if (!existing) {
            // Create employee record for users created via admin invite
            const isAdmin = firebaseUser.email === ADMIN_EMAIL;
            await create<Employee>(Collections.EMPLOYEES, {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email || "Unknown",
              email: firebaseUser.email || "",
              phone: "",
              role: isAdmin ? "Admin" : "Labourer",
              status: "active",
              uid: firebaseUser.uid,
              createdAt: new Date().toISOString(),
            });
          } else if (
            firebaseUser.email === ADMIN_EMAIL &&
            existing.role !== "Admin"
          ) {
            // Always ensure the admin email has Admin role
            await update<Employee>(Collections.EMPLOYEES, firebaseUser.uid, {
              role: "Admin",
            });
          }
        } catch (err) {
          console.error("Failed to sync employee record:", err);
        }
      }
    });
    return unsubscribe;
  }, []);

  // ── Actions ──
  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}
