import React, { useEffect, useState } from "react";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, googleProvider } from "./firebase";

function getRedirectAndMsg(search) {
  const params = new URLSearchParams(search);
  return {
    redirect: params.get("redirect"),
    msg: params.get("msg"),
  };
}

export default function Login({ user, setUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [infoMsg, setInfoMsg] = useState("");

  const { redirect, msg } = getRedirectAndMsg(location.search);

  // ✅ Nasłuchiwanie stanu logowania i odświeżanie tokena
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // ✅ Wymuszamy odświeżenie tokena, aby pobrać aktualne claims
        const token = await u.getIdTokenResult(true);
        console.log("✅ Token claims:", token.claims); // 🔥 Log do konsoli
        setUser({ ...u, isAdmin: !!token.claims.isAdmin }); // Dodajemy isAdmin do usera
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, [setUser]);

  // Obsługa komunikatów na podstawie parametrów URL
  useEffect(() => {
    if (msg === "add") setInfoMsg("Aby dodać lecznicę, musisz być zalogowany.");
    else if (msg === "edit") setInfoMsg("Aby edytować dane lecznicy, musisz być zalogowany.");
    else setInfoMsg("");
  }, [msg]);

  // ✅ Logowanie przez Google
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdTokenResult(true); // Od razu pobieramy claims
      console.log("✅ Zalogowano. Claims:", token.claims);
      setUser({ ...result.user, isAdmin: !!token.claims.isAdmin });
      if (redirect) navigate(redirect, { replace: true });
    } catch (error) {
      console.error("Login Error:", error);
      alert("Błąd logowania: " + error.message);
    }
  };

  // ✅ Wylogowanie
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Logout Error:", error);
      alert("Błąd wylogowania: " + error.message);
    }
  };

  // ✅ Jeśli zalogowany, pokazujemy dane użytkownika
  if (user) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <img
          src={user.photoURL || "https://ui-avatars.com/api/?name=Użytkownik"}
          alt="avatar"
          style={{ width: 32, height: 32, borderRadius: "50%" }}
        />
        <span style={{ fontWeight: 500, color: "#2a2", display: "flex", alignItems: "center", gap: 6 }}>
          {user.displayName || user.email}
          {user.isAdmin && (
            <span style={{
              background: "#ffcc00",
              color: "#000",
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: 4
            }}>
              ADMIN
            </span>
          )}
        </span>
        <button onClick={handleLogout} style={{ marginLeft: 10, padding: "3px 12px" }}>
          Wyloguj
        </button>
      </div>
    );
  }

  // ✅ Jeśli nie zalogowany
  return (
    <div>
      {infoMsg && (
        <div style={{ color: "#b36209", fontWeight: 500, marginBottom: 10 }}>
          {infoMsg}
        </div>
      )}
      <button onClick={handleLogin} style={{ padding: "6px 16px" }}>
        Zaloguj się przez Google
      </button>
    </div>
  );
}
