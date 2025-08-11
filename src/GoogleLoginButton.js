import React, { useState, useEffect } from "react";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

export default function GoogleLoginButton({ onUserChange }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Track user state
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (onUserChange) onUserChange(firebaseUser);
    });
    return () => unsub();
  }, [onUserChange]);

  return user ? (
    <div style={{ marginBottom: 16 }}>
      <span style={{ marginRight: 10 }}>
        Zalogowano jako: <b>{user.displayName}</b>
      </span>
      <button onClick={() => signOut(auth)}>Wyloguj</button>
    </div>
  ) : (
    <button
      style={{ marginBottom: 16, padding: 6, fontWeight: 700 }}
      onClick={() => signInWithPopup(auth, googleProvider)}
    >
      Zaloguj przez Google
    </button>
  );
}
