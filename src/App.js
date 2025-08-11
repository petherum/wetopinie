import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import SearchPage from "./SearchPage";
import VetDetail from "./VetDetail";
import Login from "./Login";
import AddVetForm from "./AddVetForm";
import EditVetForm from "./EditVetForm";
import AppointmentPage from "./AppointmentPage";
import AdminDashboard from "./AdminDashboard"; // ✅ NEW: Admin Dashboard

export default function App() {
  const [user, setUser] = useState(null);

  return (
    <Router>
      {/* NAVBAR */}
      <div
        style={{
          padding: "12px 20px",
          background: "#f4f8fd",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #dde7f1",
        }}
      >
        {/* LEFT: Logo + Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Logo Link */}
          <Link
            to="/"
            style={{
              textDecoration: "none",
              color: "#0066aa",
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: 1,
            }}
          >
            WetOpinie
          </Link>

          {/* Add Vet Button (redirects to login if not authenticated) */}
          <Link
            to={user ? "/add-vet" : "/login?redirect=/add-vet&msg=add"}
            style={{
              marginLeft: 18,
              padding: "8px 20px",
              background: "#24ba36",
              color: "#fff",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 16,
              textDecoration: "none",
            }}
          >
            Dodaj lecznicę
          </Link>

          {/* ✅ Admin Panel Link (visible only for admins) */}
          {user?.isAdmin && (
            <Link
              to="/admin"
              style={{
                marginLeft: 18,
                padding: "8px 20px",
                background: "#ffcc00",
                color: "#000",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 16,
                textDecoration: "none",
              }}
            >
              ⚙️ Panel Admina
            </Link>
          )}
        </div>

        {/* RIGHT: Login/User Info */}
        <Login user={user} setUser={setUser} />
      </div>

      {/* ROUTES */}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<SearchPage user={user} />} />
        <Route path="/vet/:id" element={<VetDetail user={user} />} />
        <Route path="/vet/:id/appointment" element={<AppointmentPage user={user} />} />
        <Route path="/add-vet" element={<AddVetForm user={user} />} />
        <Route path="/edit-vet/:id" element={<EditVetForm user={user} />} />
        <Route path="/login" element={<Login user={user} setUser={setUser} />} />

        {/* ✅ Protected Admin Route */}
        <Route
          path="/admin"
          element={
            user?.isAdmin ? (
              <AdminDashboard user={user} />
            ) : (
              <div style={{ padding: 40, textAlign: "center", color: "red" }}>
                🚫 Brak dostępu: tylko dla administratorów.
              </div>
            )
          }
        />
      </Routes>
    </Router>
  );
}
