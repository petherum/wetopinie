import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

// ---------------------------
// Helper Functions
// ---------------------------

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function is24h(vet) {
  if (!vet.openingHours) return false;
  return Object.values(vet.openingHours).some(h => h === "00:00-24:00");
}

function isOpenNow(vet) {
  if (!vet.openingHours) return false;
  const dayMap = ["nd", "pn", "wt", "sr", "cz", "pt", "sb"];
  const now = new Date();
  const todayKey = dayMap[now.getDay()];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const hoursStr = vet.openingHours[todayKey];
  if (!hoursStr || hoursStr.toLowerCase().includes("zamknięte")) return false;

  return hoursStr
    .split(";")
    .map(r => r.trim())
    .filter(Boolean)
    .some(range => {
      const match = range.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
      if (!match) return false;
      const start = parseInt(match[1]) * 60 + parseInt(match[2]);
      const end = parseInt(match[3]) * 60 + parseInt(match[4]);
      return nowMinutes >= start && nowMinutes <= end;
    });
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatPhoneNumber(phone) {
  if (!phone) return "";
  let cleaned = String(phone).replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("48")) return `+${cleaned}`;
  if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);
  return `+48${cleaned}`;
}

function isValidPolishPhone(phone) {
  return /^\+48\d{9}$/.test(formatPhoneNumber(phone));
}

function formatPhoneDisplay(phone) {
  const formatted = formatPhoneNumber(phone);
  const match = formatted.match(/^\+48(\d{3})(\d{3})(\d{3})$/);
  return match ? `+48 ${match[1]} ${match[2]} ${match[3]}` : formatted;
}

// ---------------------------
// Main Component
// ---------------------------

export default function SearchPage() {
  const [vets, setVets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [debouncedName, setDebouncedName] = useState("");
  const [city, setCity] = useState("");
  const [special, setSpecial] = useState("");
  const [open24h, setOpen24h] = useState(false);
  const [openNow, setOpenNow] = useState(false);

  const [distance, setDistance] = useState(5);
  const [userCoords, setUserCoords] = useState(null);
  const [showNearby, setShowNearby] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationStatus, setLocationStatus] = useState("pending");

  // 🔍 Fetch data from Firestore
  useEffect(() => {
    const fetchVets = async () => {
      try {
        const snapshot = await getDocs(collection(db, "vets"));
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("✅ Fetched vets:", data); // Debug
        setVets(data);
      } catch (err) {
        console.error("❌ Błąd pobierania danych:", err);
        setError("Nie udało się pobrać danych z bazy.");
      } finally {
        setLoading(false);
      }
    };
    fetchVets();
  }, []);

  // Debounce name input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedName(name), 300);
    return () => clearTimeout(timer);
  }, [name]);

  const filter = useMemo(() => ({ name: debouncedName, city, special, open24h, openNow }), [debouncedName, city, special, open24h, openNow]);

  const cityList = useMemo(() => unique(vets.map(v => v.city)), [vets]);

  const specialList = useMemo(() => unique(
    vets.flatMap(v => {
      if (Array.isArray(v.specializations)) {
        return v.specializations.map(s => s.trim());
      }
      if (typeof v.specializations === "string") {
        return v.specializations.split(",").map(s => s.trim());
      }
      return [];
    })
  ), [vets]);

  const filtered = useMemo(() => {
    const results = vets.filter(vet => {
      if (filter.name && !vet.name?.toLowerCase().includes(filter.name.toLowerCase())) return false;
      if (filter.city && vet.city !== filter.city) return false;
      if (filter.special && !(vet.specializations || "").includes(filter.special)) return false;
      if (filter.open24h && !is24h(vet)) return false;
      if (filter.openNow && !isOpenNow(vet)) return false;
      if (showNearby && userCoords && (!vet.lat || !vet.lng ||
        getDistanceKm(userCoords.lat, userCoords.lng, Number(vet.lat), Number(vet.lng)) > distance)) return false;
      return true;
    });

    if (showNearby && userCoords) {
      return results.sort((a, b) => {
        const distA = getDistanceKm(userCoords.lat, userCoords.lng, Number(a.lat), Number(a.lng));
        const distB = getDistanceKm(userCoords.lat, userCoords.lng, Number(b.lat), Number(b.lng));
        return distA - distB;
      });
    } else {
      return results.sort((a, b) => {
        const reviewsA = Number(a.ReviewsCount || 0);
        const reviewsB = Number(b.ReviewsCount || 0);
        if (reviewsB !== reviewsA) return reviewsB - reviewsA;
        return (a.name || "").localeCompare(b.name || "", "pl", { sensitivity: "base" });
      });
    }
  }, [vets, filter, showNearby, userCoords, distance]);

  const hasActiveFilters = useMemo(() => {
    return (
      filter.name.trim() !== "" ||
      filter.city.trim() !== "" ||
      filter.special.trim() !== "" ||
      filter.open24h ||
      filter.openNow ||
      showNearby
    );
  }, [filter, showNearby]);

  const handleClearFilters = () => {
    setName("");
    setCity("");
    setSpecial("");
    setOpen24h(false);
    setOpenNow(false);
    setShowNearby(false);
  };

  function handleShowNearby(e) {
    e?.preventDefault?.();
    if (userCoords) {
      setShowNearby(true);
      return;
    }
    if (!navigator.geolocation) {
      setLocationError("Twoja przeglądarka nie obsługuje geolokalizacji.");
      setLocationStatus("denied");
      return;
    }
    setLocationStatus("pending");
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setShowNearby(true);
        setLocationError("");
        setLocationStatus("granted");
      },
      () => {
        setLocationError("Nie udało się pobrać lokalizacji.");
        setShowNearby(false);
        setLocationStatus("denied");
      }
    );
  }

  if (loading) return <div style={{ margin: 40 }}>⏳ Ładowanie danych...</div>;
  if (error) return <div style={{ margin: 40, color: "#b00" }}>{error}</div>;

  return (
    <div style={{ maxWidth: 700, margin: "32px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, marginBottom: 22, textAlign: "center" }}>
        Wyszukiwarka lecznic weterynaryjnych
      </h1>

      <form
        onSubmit={e => e.preventDefault()}
        style={{
          display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 22,
          background: "#f7faff", padding: 18, borderRadius: 10, border: "1px solid #eef2f7"
        }}
      >
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nazwa lecznicy"
          style={{ flex: 2, minWidth: 160, padding: 6 }}
        />
        <select value={city} onChange={e => setCity(e.target.value)} style={{ flex: 1, minWidth: 120, padding: 6 }}>
          <option value="">Miasto</option>
          {cityList.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={special} onChange={e => setSpecial(e.target.value)} style={{ flex: 2, minWidth: 160, padding: 6 }}>
          <option value="">Specjalizacja</option>
          {specialList.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", fontWeight: 500 }}>
          <input type="checkbox" checked={open24h} onChange={e => setOpen24h(e.target.checked)} style={{ marginRight: 6 }} />
          Otwarte 24h
        </label>
        <label style={{ display: "flex", alignItems: "center", fontWeight: 500 }}>
          <input type="checkbox" checked={openNow} onChange={e => setOpenNow(e.target.checked)} style={{ marginRight: 6 }} />
          Otwarte teraz
        </label>
        <button type="button" onClick={handleClearFilters} style={{ padding:"6px 12px", background:"#eee" }}>Wyczyść</button>
      </form>

      {/* Nearby Search */}
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 2 }}>
        <label>Szukaj w promieniu:</label>
        <input type="range" min={1} max={10} value={distance} onChange={e => setDistance(Number(e.target.value))} />
        <span><b>{distance} km</b></span>
        <button type="button" onClick={handleShowNearby}>📍 Pokaż w mojej okolicy</button>
      </div>
      <div style={{ fontSize: 13, marginTop: 6, color: "#666" }}>
        {locationStatus === "pending" && "📍 Pobieranie lokalizacji..."}
        {locationStatus === "granted" && userCoords && (
          <>Lokalizacja: <b>{userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)}</b></>
        )}
        {locationStatus === "denied" && <span style={{ color: "#b00" }}>🚫 Dostęp do lokalizacji odrzucony.</span>}
      </div>
      {locationError && <div style={{ color: "#b00", marginTop: 8 }}>{locationError}</div>}

      {/* Results */}
      <div>
        {!hasActiveFilters ? (
          <div style={{ marginTop: 24, color: "#666", textAlign: "center" }}>
            Wprowadź kryteria wyszukiwania, aby zobaczyć lecznice.
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ color: "#b00", marginTop: 24 }}>
            Brak lecznic spełniających wybrane kryteria.
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16, fontSize: 15, color: "#444", textAlign: "center" }}>
              🔎 <b>Znaleziono {filtered.length} lecznic</b>
            </div>
            {filtered.map(vet => {
              const formattedPhone = formatPhoneNumber(vet.phone);
              const displayPhone = formatPhoneDisplay(vet.phone);
              const validPhone = isValidPolishPhone(vet.phone);

              return (
                <div key={vet.id} style={{
                  border: "1px solid #e1e4e8", background: "#fff", borderRadius: 14,
                  marginBottom: 16, padding: 16, boxShadow: "0 2px 6px #f0f4fa"
                }}>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>
                    <Link to={`/vet/${vet.id}`}>{vet.name}</Link>
                    {isOpenNow(vet) && <span style={{ color: "#24ba36", fontSize: 14 }}> ✅ Otwarte</span>}
                  </div>
                  <div style={{ color: "#444", marginTop: 4 }}>{vet.address}</div>
                  {vet.address && (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(vet.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#007bff", fontSize: 13 }}>Pokaż na mapie</a>
                  )}
                  <div style={{ color: "#666", marginTop: 3 }}>
                    <b>Miasto:</b> {vet.city}
                    {vet.phone && (
                      <> &nbsp;|&nbsp;
                        <b>Tel:</b>
                        {validPhone ? (
                          <a href={`tel:${formattedPhone}`} style={{ color: "#007bff" }}>
                            {displayPhone}
                          </a>
                        ) : (
                          <span style={{ color: "#b00" }}>Nieprawidłowy numer</span>
                        )}
                      </>
                    )}
                  </div>
                  <div style={{ color: "#777", marginTop: 4 }}>
                    <b>Specjalizacje:</b> {Array.isArray(vet.specializations) ? vet.specializations.join(", ") : vet.specializations || "-"}
                  </div>
                  {showNearby && userCoords && vet.lat && vet.lng && (
                    <div style={{ color: "#197", marginTop: 2, fontWeight: 500 }}>
                      Odległość: {getDistanceKm(userCoords.lat, userCoords.lng, Number(vet.lat), Number(vet.lng)).toFixed(2)} km
                    </div>
                  )}
                  <div style={{ marginTop: 8 }}>
                    <Link to={`/vet/${vet.id}`} style={{ color: "#0056a7", textDecoration: "underline" }}>Zobacz szczegóły →</Link>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
