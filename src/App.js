// app.js
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import "./App.css";

import SearchPage from "./SearchPage";
import VetDetail from "./VetDetail";
import Login from "./Login";
import AddVetForm from "./AddVetForm";
import EditVetForm from "./EditVetForm";
import AppointmentPage from "./AppointmentPage";
import AdminDashboard from "./AdminDashboard";
import Footer from "./components/Footer";

// Strony informacyjne
import About from "./pages/About";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";

function Header({ user, setUser }) {
  const location = useLocation();

  // Szerokość kontenera w headerze = szerokość głównej treści poniżej
  const containerMax =
    location.pathname.startsWith("/vet/") ? 960 : 1100; // VetDetail ma 960, Search itp. 1100

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        padding: "12px 16px",
        background: "var(--color-primary-700)",
        borderBottom: "1px solid rgba(0,0,0,.06)",
        color: "#fff",
      }}
    >
      {/* Wewnętrzny kontener wyrównany do treści stron */}
      <div
        style={{
          maxWidth: containerMax,
          margin: "0 auto",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between", // lewa i prawa sekcja przy krawędziach treści
          gap: 12,
        }}
      >
        {/* Lewa sekcja: przy samej lewej krawędzi treści */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            to={user ? "/add-vet" : "/login?redirect=/add-vet&msg=add"}
            style={{
              padding: "8px 12px",
              background: "var(--color-accent-500)",
              color: "#14202b",
              borderRadius: "var(--radius-sm)",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
              boxShadow: "var(--shadow-sm)",
              border: "var(--border-width) solid rgba(0,0,0,.04)",
              whiteSpace: "nowrap",
            }}
          >
            Dodaj lecznicę
          </Link>

          {user?.isAdmin && (
            <Link
              to="/admin"
              style={{
                padding: "8px 12px",
                background: "#ffffff",
                color: "var(--color-primary-700)",
                borderRadius: "var(--radius-sm)",
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
                boxShadow: "var(--shadow-sm)",
                whiteSpace: "nowrap",
              }}
            >
              ⚙️ Panel Admina
            </Link>
          )}
        </div>

        {/* Marka – idealnie wyśrodkowana względem KONTENERA treści */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            pointerEvents: "auto",
          }}
        >
          <Link
            to="/"
            style={{
              textDecoration: "none",
              color: "#fff",
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: 0.5,
              whiteSpace: "nowrap",
            }}
            aria-current={location.pathname === "/" ? "page" : undefined}
          >
            Vet4You
          </Link>
        </div>

        {/* Prawa sekcja: przy samej prawej krawędzi treści */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Login user={user} setUser={setUser} />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);

  return (
    <Router>
      {/* Sticky footer wrapper */}
      <div className="appShell" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Header user={user} setUser={setUser} />

        <main className="appMain" style={{ flex: "1 0 auto" }}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<SearchPage user={user} />} />
            <Route path="/vet/:id" element={<VetDetail user={user} />} />
            <Route path="/vet/:id/appointment" element={<AppointmentPage user={user} />} />
            <Route path="/add-vet" element={<AddVetForm user={user} />} />
            <Route path="/edit-vet/:id" element={<EditVetForm user={user} />} />
            <Route path="/login" element={<Login user={user} setUser={setUser} />} />

            {/* Strony informacyjne */}
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/contact" element={<Contact />} />

            {/* Admin */}
            <Route
              path="/admin"
              element={
                user?.isAdmin ? (
                  <AdminDashboard user={user} />
                ) : (
                  <div style={{ padding: 40, textAlign: "center", color: "var(--color-danger)" }}>
                    🚫 Brak dostępu: tylko dla administratorów.
                  </div>
                )
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}
