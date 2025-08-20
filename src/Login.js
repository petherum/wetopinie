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

  // ✅ Nasłuchiwanie stanu logowania i odświeżanie tokena (claims)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const token = await u.getIdTokenResult(true);
        setUser({ ...u, isAdmin: !!token.claims.isAdmin });
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, [setUser]);

  // ✅ Komunikaty informacyjne z URL
  useEffect(() => {
    if (msg === "add") setInfoMsg("Aby dodać lecznicę, musisz być zalogowany.");
    else if (msg === "edit") setInfoMsg("Aby edytować dane lecznicy, musisz być zalogowany.");
    else setInfoMsg("");
  }, [msg]);

  // ✅ Logowanie przez Google
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdTokenResult(true);
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

  // Wspólne style komponentu (spójne z theme poprzez zmienne CSS)
  const styles = `
    .googleBtn{
      display:inline-flex; align-items:center; gap:10px;
      padding:12px 16px; min-height:44px;
      border-radius:var(--radius-lg);
      border:var(--border-width) solid var(--color-border);
      background:#fff; color:var(--color-primary-700);
      font-weight:700; cursor:pointer; text-decoration:none;
    }
    .googleBtn:hover{
      background: color-mix(in srgb, var(--color-primary-500) 10%, #fff);
    }
    .googleBtn:active{ transform: translateY(1px); }
    .googleBtn .gmark{
      display:inline-flex; width:20px; height:20px; border-radius:4px;
      justify-content:center; align-items:center; font-weight:800;
      border:var(--border-width) solid var(--color-border);
      background:var(--color-surface);
    }

    .userBox{ position:relative; display:inline-flex; }
    .avatarBtn{
      width:36px; height:36px; border-radius:9999px; padding:0;
      display:inline-flex; align-items:center; justify-content:center;
      font-weight:800; color:var(--color-primary-700);
      background:var(--color-surface);
      border:var(--border-width) solid var(--color-border);
      cursor:pointer;
    }
    .userMenu{
      position:absolute; right:0; top:calc(100% + 8px);
      display:none;
      background:var(--color-surface);
      border:var(--border-width) solid var(--color-border);
      border-radius:var(--radius-md); box-shadow:var(--shadow-lg);
      min-width:160px; padding:6px; z-index:50;
    }
    .userMenu > *{
      width:100%; padding:10px 12px; text-align:left;
      background:transparent; border:none; cursor:pointer;
      color:var(--color-text);
    }
    .userMenu > *:hover{
      background: color-mix(in srgb, var(--color-primary-500) 10%, #fff);
    }
    .userBox:hover .userMenu,
    .userBox:focus-within .userMenu{ display:block; }

    .loginInfoMsg{
      color:#b36209; font-weight:500; margin-bottom:10px;
    }
  `;

  // ✅ Render
  const initial =
    ((user?.displayName || user?.email || "?").trim()[0] || "?").toUpperCase();

  return (
    <>
      <style>{styles}</style>

      {user ? (
        // 🔒 Zalogowany: tylko kółko z literą; "Wyloguj" na hover/focus
        <div className="userBox" aria-label="Menu użytkownika">
          <button
            className="avatarBtn"
            aria-haspopup="menu"
            aria-expanded="false"
            title={user?.email || "Profil"}
          >
            {initial}
          </button>

          <div className="userMenu" role="menu" aria-label="Opcje użytkownika">
            <button type="button" onClick={handleLogout} role="menuitem">
              Wyloguj
            </button>
          </div>
        </div>
      ) : (
        // 🔓 Niezalogowany: komunikat + przycisk Google w stylu portalu
        <div>
          {infoMsg && <div className="loginInfoMsg">{infoMsg}</div>}

          <button
            className="googleBtn"
            onClick={handleLogin}
            aria-label="Zaloguj się przez Google"
          >
            <span className="gmark" aria-hidden>G</span>
            Zaloguj się przez Google
          </button>
        </div>
      )}
    </>
  );
}
