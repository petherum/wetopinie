import React, { useState, useMemo, useEffect, useDeferredValue, useRef } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";


// ---------------------------
// Helper Functions
// ---------------------------
const notNil = (v) => v != null;

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function removeDiacritics(str = "") {
  return str
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function is24h(vet) {
  if (!vet?.openingHours) return false;
  return Object.values(vet.openingHours).some((h) =>
    String(h).includes("00:00-24:00")
  );
}

// Obsługa zakresów przez północ + 24:00, koniec ekskluzywny
function isOpenNow(vet) {
  if (!vet?.openingHours) return false;

  const dayMap = ["nd", "pn", "wt", "sr", "cz", "pt", "sb"];
  const now = new Date();
  const todayKey = dayMap[now.getDay()];
  const hoursStrRaw = vet.openingHours[todayKey];
  if (!hoursStrRaw) return false;

  const hoursStr = removeDiacritics(String(hoursStrRaw));
  if (hoursStr.includes("zamkn")) return false; // zamknięte / zamkniete

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return hoursStr
    .split(";")
    .map((r) => r.trim())
    .filter(Boolean)
    .some((range) => {
      const m = range.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
      if (!m) return false;
      const start = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      let end = parseInt(m[3], 10) * 60 + parseInt(m[4], 10);

      // specjalny przypadek 24:00
      if (/24:00$/.test(range)) end = 24 * 60;

      if (start <= end) {
        // zwykły przedział w ramach dnia (koniec ekskluzywny)
        return nowMinutes >= start && nowMinutes < end;
      } else {
        // przez północ: np. 22:00-06:00
        return nowMinutes >= start || nowMinutes < end;
      }
    });
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatPhoneNumber(phone) {
  if (!phone) return "";
  let cleaned = String(phone).replace(/[\s\-()./]/g, "");
  if (cleaned.startsWith("0048")) cleaned = `+48${cleaned.slice(4)}`;
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
// Skeleton
// ---------------------------
const SkeletonCard = () => (
  <div className="card skeleton">
    <div className="sk-row" style={{ width: "60%", height: 22 }} />
    <div className="sk-row" style={{ width: "40%", height: 16 }} />
    <div className="sk-row" style={{ width: "80%", height: 14 }} />
    <div className="sk-row" style={{ width: "70%", height: 14 }} />
    <div className="sk-row" style={{ width: "50%", height: 14 }} />
    <div className="actionBar">
      <div className="sk-btn" />
      <div className="sk-btn" />
      <div className="sk-btn" />
    </div>
  </div>
);

// ---------------------------
// Main Component
// ---------------------------
export default function SearchPage() {
  const [vets, setVets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const deferredName = useDeferredValue(name); // uproszczenie: bez własnego debounce

  const [city, setCity] = useState("");
  const [special, setSpecial] = useState("");
  const [open24h, setOpen24h] = useState(false);
  const [openNow, setOpenNow] = useState(false);

  const [distance, setDistance] = useState(5);
  const [userCoords, setUserCoords] = useState(null);
  const [showNearby, setShowNearby] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationStatus, setLocationStatus] = useState("idle"); // idle | pending | granted | denied

  // Custom dropdowns
  const [showCityDd, setShowCityDd] = useState(false);
  const [showSpecDd, setShowSpecDd] = useState(false);
  const cityFieldRef = useRef(null);
  const specFieldRef = useRef(null);

  // 🔍 Fetch data from Firestore
  useEffect(() => {
    let cancelled = false;
    const fetchVets = async () => {
      try {
        const snapshot = await getDocs(collection(db, "vets"));
        if (cancelled) return;
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setVets(data);
      } catch (err) {
        console.error("❌ Błąd pobierania danych:", err);
        setError("Nie udało się pobrać danych z bazy.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchVets();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist & restore filters (localStorage)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("filters") || "{}");
      if (saved) {
        if (saved.name) setName(saved.name);
        if (saved.city) setCity(saved.city);
        if (saved.special) setSpecial(saved.special);
        if (typeof saved.open24h === "boolean") setOpen24h(saved.open24h);
        if (typeof saved.openNow === "boolean") setOpenNow(saved.openNow);
        if (typeof saved.distance === "number") setDistance(saved.distance);
        if (typeof saved.showNearby === "boolean") setShowNearby(saved.showNearby);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const payload = { name, city, special, open24h, openNow, distance, showNearby };
    localStorage.setItem("filters", JSON.stringify(payload));
  }, [name, city, special, open24h, openNow, distance, showNearby]);

  // Geolokalizacja na żądanie
  const requestLocation = () => {
    if (userCoords || locationStatus === "pending" || locationStatus === "denied") return;
    if (!navigator.geolocation) {
      setLocationError("Twoja przeglądarka nie obsługuje geolokalizacji.");
      setLocationStatus("denied");
      return;
    }
    setLocationStatus("pending");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationError("");
        setLocationStatus("granted");
      },
      () => {
        setLocationError("Nie udało się pobrać lokalizacji. Upewnij się, że zezwoliłeś(-aś) na dostęp w przeglądarce.");
        setLocationStatus("denied");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  };

  // Listy (specjalizacje alfabetycznie)
  const specialList = useMemo(
    () =>
      unique(
        vets.flatMap((v) => {
          if (Array.isArray(v.specializations)) return v.specializations.map((s) => s.trim());
          if (typeof v.specializations === "string")
            return v.specializations.split(",").map((s) => s.trim());
          return [];
        })
      ).sort((a, b) => a.localeCompare(b, "pl", { sensitivity: "base" })),
    [vets]
  );

  // Miasta: najpierw najbliższe (jeśli zgoda), potem alfabetycznie; bez zgody: alfabetycznie
  const cityListSorted = useMemo(() => {
    const all = unique(vets.map((v) => v.city)).filter(Boolean);
    const alphabetical = [...all].sort((a, b) => a.localeCompare(b, "pl", { sensitivity: "base" }));
    if (userCoords && locationStatus === "granted") {
      const buckets = {};
      for (const v of vets) {
        if (!v.city || v.lat == null || v.lng == null) continue;
        if (!buckets[v.city]) buckets[v.city] = { lat: 0, lng: 0, n: 0 };
        buckets[v.city].lat += Number(v.lat);
        buckets[v.city].lng += Number(v.lng);
        buckets[v.city].n += 1;
      }
      const entries = Object.entries(buckets).map(([c, { lat, lng, n }]) => ({
        city: c,
        dist: getDistanceKm(userCoords.lat, userCoords.lng, lat / n, lng / n),
      }));
      if (entries.length) {
        entries.sort((a, b) => a.dist - b.dist);
        const nearest = entries[0].city;
        const rest = alphabetical.filter((c) => c !== nearest);
        return [nearest, ...rest];
      }
    }
    return alphabetical;
  }, [vets, userCoords, locationStatus]);

  // Sugestie (dopasowanie bez ogonków)
  const citySuggestions = useMemo(() => {
    const q = removeDiacritics(city.trim());
    return q ? cityListSorted.filter((c) => removeDiacritics(c).includes(q)) : cityListSorted;
  }, [city, cityListSorted]);

  const specSuggestions = useMemo(() => {
    const q = removeDiacritics(special.trim());
    return q ? specialList.filter((s) => removeDiacritics(s).includes(q)) : specialList;
  }, [special, specialList]);

  // Odległości cache'owane (dla sortu i wyświetlania)
  const distances = useMemo(() => {
    if (!showNearby || !userCoords) return new Map();
    const map = new Map();
    for (const v of vets) {
      if (v.lat != null && v.lng != null) {
        map.set(
          v.id,
          getDistanceKm(userCoords.lat, userCoords.lng, Number(v.lat), Number(v.lng))
        );
      }
    }
    return map;
  }, [showNearby, userCoords, vets]);

  const nfPL = useMemo(() => new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 1 }), []);

  // Filtry (bez ogonków; city/spec partial match)
  const filter = useMemo(
    () => ({ name: deferredName, city, special, open24h, openNow }),
    [deferredName, city, special, open24h, openNow]
  );

  const filtered = useMemo(() => {
    const results = vets.filter((vet) => {
      if (filter.name && !removeDiacritics(vet.name || "").includes(removeDiacritics(filter.name))) return false;

      if (filter.city) {
        // tolerancyjne dopasowanie (partial + bez ogonków)
        if (!removeDiacritics(vet.city || "").includes(removeDiacritics(filter.city))) return false;
      }

      if (filter.special) {
        const specs = Array.isArray(vet.specializations)
          ? vet.specializations
          : typeof vet.specializations === "string"
          ? vet.specializations.split(",").map((s) => s.trim())
          : [];
        const q = removeDiacritics(filter.special);
        if (!specs.some((s) => removeDiacritics(s).includes(q))) return false;
      }

      if (filter.open24h && !is24h(vet)) return false;
      if (filter.openNow && !isOpenNow(vet)) return false;

      if (showNearby && userCoords) {
        if (vet.lat == null || vet.lng == null) return false;
        const d = distances.get(vet.id);
        if (typeof d !== "number" || d > distance) return false;
      }
      return true;
    });

    // sortowanie: w pobliżu -> po dystansie; w przeciwnym razie: Otwarte teraz -> ReviewsCount -> nazwa
    if (showNearby && userCoords) {
      return results.sort((a, b) => (distances.get(a.id) ?? Infinity) - (distances.get(b.id) ?? Infinity));
    } else {
      return results.sort((a, b) => {
        const openA = isOpenNow(a) ? 1 : 0;
        const openB = isOpenNow(b) ? 1 : 0;
        if (openB !== openA) return openB - openA;
        const reviewsA = Number(a.ReviewsCount || 0);
        const reviewsB = Number(b.ReviewsCount || 0);
        if (reviewsB !== reviewsA) return reviewsB - reviewsA;
        return (a.name || "").localeCompare(b.name || "", "pl", { sensitivity: "base" });
      });
    }
  }, [vets, filter, showNearby, userCoords, distance, distances]);

  const hasActiveFilters = useMemo(() => {
    return (
      removeDiacritics(filter.name).trim() !== "" ||
      removeDiacritics(filter.city).trim() !== "" ||
      removeDiacritics(filter.special).trim() !== "" ||
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
    setDistance(5);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (cityFieldRef.current && !cityFieldRef.current.contains(e.target)) setShowCityDd(false);
      if (specFieldRef.current && !specFieldRef.current.contains(e.target)) setShowSpecDd(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // ---------------------------
  // UI
  // ---------------------------
  if (error)
    return (
      <div style={{ margin: 40, color: "#b00" }} role="alert">
        {error}
      </div>
    );

  return (
    <div className="container searchPage" style={{ maxWidth: 1100, margin: "24px auto", padding: 16 }}>
      {/* CSS (motyw Vet4You + ukrycie ewentualnych starych formularzy) */}
      <style>{`
        .title{font-size:24px;margin-bottom:16px;text-align:center;color:var(--color-text)}
        @media(min-width:640px){.title{font-size:28px}}

        /* 🔒 ukryj wszystkie inne formy w obrębie SearchPage poza naszym nowym */
        .searchPage > form:not(#newSearchForm) { display: none !important; }

        .searchForm{background:var(--color-bg);padding:16px;border-radius:var(--radius-md);border:var(--border-width) solid var(--color-border)}

        /* Wyśrodkowana siatka na 3 kafle — mała przerwa między polami, bez nachodzenia */
        .searchFields{
          display:grid;
          grid-template-columns:1fr;
          gap:12px;                         /* mała przerwa także na mobile */
          max-width:980px; margin:0 auto;
        }
        @media (min-width: 720px){
          .searchFields{
            grid-template-columns:repeat(3, minmax(240px, 1fr));
            column-gap:12px;                /* mała przerwa w poziomie */
            row-gap:0;
          }
        }

        .field{
          position:relative;
          background:var(--color-surface);
          border:var(--border-width) solid var(--color-border);
          border-radius:var(--radius-md);
          min-width:0;                      /* zapobiega „wypychan iu” i nachodzeniu */
        }
        .field input[type="text"]{
          width:100%;
          box-sizing:border-box;            /* pilnuje szerokości w obrębie kafla */
          border:var(--border-width) solid var(--color-border);
          border-radius:calc(var(--radius-md) - 2px);
          padding:12px; min-height:44px;
          background:#fff; color:var(--color-text);
        }
        .field input[type="text"]:focus{
          outline:none; border-color:var(--focus-ring);
          box-shadow:0 0 0 var(--focus-width) color-mix(in srgb, var(--focus-ring) 35%, transparent);
        }

        /* Custom dropdown — pełna szerokość kafla */
        .dropdown{
          position:absolute; left:8px; right:8px; top:calc(100% + 6px);
          background:var(--color-surface); border:var(--border-width) solid var(--color-border); border-radius:var(--radius-md); box-shadow:var(--shadow-lg);
          max-height:260px; overflow:auto; z-index:20;
        }
        .dropdown ul{ list-style:none; margin:0; padding:6px; }
        .dropdown li{
          padding:10px 12px; border-radius:8px; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }
        .dropdown li:hover{ background: color-mix(in srgb, var(--color-primary-500) 10%, #fff); }
        .dropdown .empty{ padding:10px 12px; color:var(--color-text-muted); }

        .checkboxes{display:flex;gap:12px;flex-wrap:wrap;margin-top:12px}
        .rangeRow{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:14px 0 6px}
        .card{border:var(--border-width) solid var(--color-border);background:var(--color-surface);border-radius:var(--radius-lg);margin-bottom:16px;padding:16px;box-shadow:var(--shadow-md);animation:fadeIn .25s ease-out both}
        .meta{color:var(--color-text-muted);margin-top:3px}
        .small{font-size:13px;color:var(--color-text-muted)}
        .actionBar{position:sticky;bottom:-1px;background:linear-gradient(180deg, rgba(255,255,255,0), var(--color-surface) 32%);padding-top:10px;margin-top:10px;border-top:var(--border-width) solid var(--color-border);display:flex;gap:8px}
        .actionBtn{flex:1;display:flex;align-items:center;justify-content:center;text-decoration:none;border:var(--border-width) solid var(--color-border);border-radius:var(--radius-md);min-height:48px;font-weight:700;color:var(--color-primary-700);background:#fff}
        .actionBtn:hover{ background: color-mix(in srgb, var(--color-primary-500) 10%, #fff); }
        .actionBtn:active{transform:translateY(1px)}
        .skeleton .sk-row{background:linear-gradient(90deg,var(--color-surface-muted), #e9eef6, var(--color-surface-muted));background-size:200% 100%;border-radius:8px;margin:6px 0;animation:shimmer 1.2s infinite linear}
        .skeleton .sk-btn{height:48px;flex:1;border-radius:12px;background:linear-gradient(90deg,var(--color-surface-muted),#e9eef6,var(--color-surface-muted));background-size:200% 100%;animation:shimmer 1.2s infinite linear}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
        @media (prefers-reduced-motion: reduce){
          .card{animation:none}
          .skeleton .sk-row,.skeleton .sk-btn{animation:none}
        }
      `}</style>

      <h1 className="title">Najszybsza wyszukiwarka weterynarza</h1>

      {/* FORMULARZ */}
      <form id="newSearchForm" onSubmit={(e) => e.preventDefault()} className="searchForm" aria-label="Wyszukiwarka lecznic">
        {/* 3 POLA w kaflach */}
        <div className="searchFields">
          {/* Nazwa */}
          <div className="field">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nazwa lecznicy"
              aria-label="Nazwa lecznicy"
              aria-autocomplete="list"
              inputMode="search"
              onKeyDown={(e) => {
                if (e.key === "Escape") e.currentTarget.blur();
              }}
              autoComplete="off"
            />
          </div>

          {/* Miasto */}
          <div className="field" ref={cityFieldRef}>
            <input
              type="text"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setShowCityDd(true);
              }}
              onFocus={() => setShowCityDd(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setShowCityDd(false);
              }}
              placeholder="Miasto (zacznij pisać...)"
              aria-label="Miasto"
              aria-expanded={showCityDd}
              autoComplete="off"
            />
            {showCityDd && (
              <div className="dropdown" role="listbox" aria-label="Lista miast">
                {citySuggestions.length ? (
                  <ul>
                    {citySuggestions.map((c) => (
                      <li
                        key={c}
                        role="option"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setCity(c);
                          setShowCityDd(false);
                        }}
                      >
                        {c}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty">Brak dopasowań</div>
                )}
              </div>
            )}
          </div>

          {/* Specjalizacja */}
          <div className="field" ref={specFieldRef}>
            <input
              type="text"
              value={special}
              onChange={(e) => {
                setSpecial(e.target.value);
                setShowSpecDd(true);
              }}
              onFocus={() => setShowSpecDd(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setShowSpecDd(false);
              }}
              placeholder="Specjalizacja (zacznij pisać...)"
              aria-label="Specjalizacja"
              aria-expanded={showSpecDd}
              autoComplete="off"
            />
            {showSpecDd && (
              <div className="dropdown" role="listbox" aria-label="Lista specjalizacji">
                {specSuggestions.length ? (
                  <ul>
                    {specSuggestions.map((s) => (
                      <li
                        key={s}
                        role="option"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSpecial(s);
                          setShowSpecDd(false);
                        }}
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty">Brak dopasowań</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Checkboksy */}
        <div className="checkboxes" role="group" aria-label="Filtry otwarcia">
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
            <input type="checkbox" checked={open24h} onChange={(e) => setOpen24h(e.target.checked)} />
            Otwarte 24h
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
            <input type="checkbox" checked={openNow} onChange={(e) => setOpenNow(e.target.checked)} />
            Otwarte teraz
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={showNearby}
              onChange={(e) => setShowNearby(e.target.checked)}
              onFocus={requestLocation}
            />
            Uwzględnij odległość
          </label>
        </div>
      </form>

      {/* Nearby Search (pokazuj suwak tylko gdy włączony filtr w pobliżu) */}
      {showNearby && (
        <div className="rangeRow" role="group" aria-label="Szukaj w mojej okolicy">
          <label htmlFor="distance">Szukaj w promieniu:</label>
          <input
            id="distance"
            type="range"
            min={1}
            max={30}
            value={distance}
            onChange={(e) => {
              setDistance(Number(e.target.value));
              requestLocation();
            }}
            onTouchStart={requestLocation}
            onMouseDown={requestLocation}
            aria-valuemin={1}
            aria-valuemax={30}
            aria-valuenow={distance}
            aria-describedby="distanceHelp"
          />
          <span>
            <b>{distance} km</b>
          </span>
          <span id="distanceHelp" className="small">
            &nbsp;(kilometry)
          </span>
        </div>
      )}

      {/* Przyciski pod sliderem */}
      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          onClick={handleClearFilters}
          aria-label="Wyczyść Wyszukiwanie"
          style={{
            width: "100%",
            padding: "12px 14px",
            background: "var(--color-surface-muted)",
            border: "var(--border-width) solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontWeight: 700,
            minHeight: 48,
            color: "var(--color-primary-700)",
          }}
        >
          Wyczyść Wyszukiwanie
        </button>
      </div>

      <div className="small" style={{ marginTop: 6 }} aria-live="polite">
        {locationStatus === "pending" && "📍 Pobieranie lokalizacji..."}
        {locationStatus === "granted" && userCoords && (
          <>
            Lokalizacja: <b>{userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)}</b>
          </>
        )}
        {locationStatus === "denied" && (
          <span style={{ color: "var(--color-danger)" }}>🚫 Dostęp do lokalizacji odrzucony.</span>
        )}
      </div>
      {locationError && (
        <div style={{ color: "var(--color-danger)", marginTop: 8 }} role="status">
          {locationError}
        </div>
      )}

      {/* Results */}
      <div>
        {loading ? (
          <>
            <div style={{ marginBottom: 12, fontSize: 15, color: "var(--color-text)", textAlign: "center" }} aria-live="polite">
              ⏳ Ładowanie...
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </>
        ) : !hasActiveFilters ? (
          <div style={{ marginTop: 24, color: "var(--color-text-muted)", textAlign: "center" }}>
            Wprowadź kryteria wyszukiwania, aby zobaczyć lecznice.
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ color: "var(--color-danger)", marginTop: 24 }} role="status">
            Brak lecznic spełniających wybrane kryteria.
          </div>
        ) : (
          <>
            <div
              style={{ marginBottom: 12, fontSize: 15, color: "var(--color-text)", textAlign: "center" }}
              aria-live="polite"
            >
              🔎 <b>Znaleziono {filtered.length} lecznic</b>
            </div>
            {filtered.map((vet) => {
              const formattedPhone = formatPhoneNumber(vet.phone);
              const displayPhone = formatPhoneDisplay(vet.phone);
              const validPhone = isValidPolishPhone(vet.phone);

              const hasCoords = vet.lat != null && vet.lng != null;
              const mapsHref = hasCoords
                ? `https://www.google.com/maps/search/?api=1&query=${vet.lat},${vet.lng}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(vet.address || "")}`;

              const dist = hasCoords && distances.has(vet.id) ? distances.get(vet.id) : null;

              return (
                <div key={vet.id} className="card">
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>
                    <Link to={`/vet/${vet.id}`}>{vet.name}</Link>
                    {isOpenNow(vet) && (
                      <span style={{ color: "var(--color-success)", fontSize: 14 }}> ✅ Otwarte</span>
                    )}
                  </div>

                  <div style={{ color: "var(--color-text)", marginTop: 4 }}>
                    <b>Adres:</b> {vet.address || "—"}
                  </div>

                  <div className="meta">
                    <b>Miasto:</b> {vet.city || "—"}
                    {vet.phone && (
                      <>
                        &nbsp;|&nbsp;
                        <b>Tel:</b>{" "}
                        {validPhone ? (
                          <a href={`tel:${formattedPhone}`} style={{ color: "var(--color-primary-500)" }}>
                            {displayPhone}
                          </a>
                        ) : (
                          <span style={{ color: "var(--color-danger)" }}>Nieprawidłowy numer</span>
                        )}
                      </>
                    )}
                  </div>

                  <div style={{ color: "var(--color-text-muted)", marginTop: 4 }}>
                    <b>Specjalizacje:</b>{" "}
                    {Array.isArray(vet.specializations)
                      ? vet.specializations.join(", ")
                      : vet.specializations || "-"}
                  </div>

                  {showNearby && userCoords && hasCoords && (
                    <div style={{ color: "#197", marginTop: 6, fontWeight: 600 }}>
                      Odległość: {dist != null ? nfPL.format(dist) : "—"} km
                    </div>
                  )}

                  {/* Sticky pasek akcji: Zadzwoń • Mapa • Szczegóły */}
                  <div className="actionBar" aria-label="Akcje">
                    {validPhone ? (
                      <a className="actionBtn" href={`tel:${formattedPhone}`} aria-label={`Zadzwoń do ${vet.name}`}>
                        📞 Zadzwoń
                      </a>
                    ) : (
                      <span className="actionBtn" style={{ opacity: 0.5, pointerEvents: "none" }}>
                        📞 Brak tel.
                      </span>
                    )}

                    {(hasCoords || vet.address) ? (
                      <a
                        className="actionBtn"
                        href={mapsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Otwórz mapę do ${vet.name}`}
                      >
                        🗺️ Mapa
                      </a>
                    ) : (
                      <span className="actionBtn" style={{ opacity: 0.5, pointerEvents: "none" }}>
                        🗺️ Brak adresu
                      </span>
                    )}

                    <Link className="actionBtn" to={`/vet/${vet.id}`} aria-label={`Zobacz szczegóły ${vet.name}`}>
                      ℹ️ Szczegóły
                    </Link>
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
