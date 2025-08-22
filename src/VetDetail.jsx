import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import AppointmentForm from "./AppointmentForm";
import Reviews from "./Reviews";

const daysOfWeek = [
  { key: "pn", label: "Poniedziałek" },
  { key: "wt", label: "Wtorek" },
  { key: "sr", label: "Środa" },
  { key: "cz", label: "Czwartek" },
  { key: "pt", label: "Piątek" },
  { key: "sb", label: "Sobota" },
  { key: "nd", label: "Niedziela" },
];

// Utility functions for phone formatting
function formatPhoneNumber(phone) {
  if (!phone) return "";
  let cleaned = String(phone).replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("48")) return `+${cleaned}`;
  if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);
  return `+48${cleaned}`;
}
function formatPhoneDisplay(phone) {
  const formatted = formatPhoneNumber(phone);
  const match = formatted.match(/^\+48(\d{3})(\d{3})(\d{3})$/);
  return match ? `+48 ${match[1]} ${match[2]} ${match[3]}` : formatted;
}
function isValidPolishPhone(phone) {
  return /^\+48\d{9}$/.test(formatPhoneNumber(phone));
}

// Opening Hours Component
function OpeningHours({ vet }) {
  if (!vet.openingHours) return null;

  const hasAnyHours = Object.values(vet.openingHours).some(
    (val) => val && String(val).trim() !== ""
  );
  if (!hasAnyHours) return null;

  return (
    <div className="vdRow">
      <div className="vdLabel">Godziny otwarcia</div>
      <div className="vdValue">
        <table className="vdHoursTable">
          <tbody>
            {daysOfWeek.map((day) => (
              <tr key={day.key}>
                <td className="vdHoursDay">{day.label}</td>
                <td className="vdHoursVal">{vet.openingHours[day.key] || "zamknięte"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function VetDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vet, setVet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const contactRef = useRef(null);
  const appointmentRef = useRef(null);
  const reviewsRef = useRef(null);

  // 🔧 Sekcyjne style (spójne z theme) + styl guzików i kontaktów
  const sectionCSS = `
    .vdCard{
      background: var(--color-surface);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      padding: 24px 26px;
      margin-bottom: 24px;
    }
    .vdSection h3{
      margin: 0 0 12px 0;
      color: var(--color-text);
      font-weight: 800;
    }
    /* Przyciski w sekcjach "Umów wizytę" i "Opinie" — zaokrąglony prostokąt */
    .vdSection button,
    .vdSection input[type="submit"],
    .vdSection .btn,
    .vdSection .primaryBtn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px 16px;
      min-height: 44px;
      border-radius: var(--radius-lg);
      border: var(--border-width) solid var(--color-border);
      background: #fff;
      color: var(--color-primary-700);
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
    }
    .vdSection button:hover,
    .vdSection input[type="submit"]:hover,
    .vdSection .btn:hover,
    .vdSection .primaryBtn:hover {
      background: color-mix(in srgb, var(--color-primary-500) 10%, #fff);
    }
    .vdSection button:active,
    .vdSection input[type="submit"]:active,
    .vdSection .btn:active,
    .vdSection .primaryBtn:active {
      transform: translateY(1px);
    }

    /* —— Dane kontaktowe: format portalu —— */
    .vdContact .vdHeader{
      display:flex; align-items:center; justify-content:space-between;
      margin-bottom: 14px;
    }
    .vdContact .vdTitle{
      font-size: 26px; font-weight: 800; color: var(--color-text); margin: 0;
    }

    /* Siatka: etykieta — wartość */
    .vdGrid{
      display: grid;
      grid-template-columns: 160px 1fr;
      gap: 8px 16px;
    }
    @media (max-width: 640px){
      .vdGrid{ grid-template-columns: 1fr; }
      .vdLabel{ font-weight: 700; margin-top: 8px; }
    }
    .vdRow{ display: contents; } /* pozwala użyć grid-a bez dodatkowych wrapperów */
    .vdLabel{
      color: var(--color-text-muted);
      align-self: start;
      padding-top: 6px;
    }
    .vdValue{ color: var(--color-text); }

    /* Link typu "pigułka" */
    .vdPillLink{
      display:inline-flex; align-items:center; gap:6px;
      padding: 6px 10px;
      border-radius: var(--radius-md);
      border: var(--border-width) solid var(--color-border);
      background:#fff; color: var(--color-primary-700);
      text-decoration:none; font-weight:700; font-size: 13px;
      margin-left: 8px;
    }
    .vdPillLink:hover{
      background: color-mix(in srgb, var(--color-primary-500) 10%, #fff);
    }

    /* Tabela godzin */
    .vdHoursTable{ width:auto; border-collapse: collapse; font-size: 15px; }
    .vdHoursDay{ padding: 4px 10px 4px 0; color: var(--color-text-muted); white-space: nowrap; }
    .vdHoursVal{ padding: 4px 0; color: var(--color-text); }
  `;

  // Fetch vet from Firestore
  useEffect(() => {
  const fetchVet = async () => {
    try {
      const docRef = doc(db, "vets", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
      const raw = docSnap.data();
      // map excel-style fields to your app schema
      const openingHours = raw.openingHours ?? {
        pn: raw.OpenHoursMonday ?? "",
        wt: raw.OpenHoursTuesday ?? "",
        sr: raw.OpenHoursWednesday ?? "",
        cz: raw.OpenHoursThursday ?? "",
        pt: raw.OpenHoursFriday ?? "",
        sb: raw.OpenHoursSaturday ?? "",
        nd: raw.OpenHoursSunday ?? "",
       };
       const phone = String(raw.phone ?? raw.Telephone ?? "");
       const name = raw.name ?? raw.NAME ?? "";
       const city = raw.city ?? raw.CITY ?? "";
       const address = raw.address ?? raw.Address ?? "";
       const specializations = Array.isArray(raw.specializations)
         ? raw.specializations
         : typeof raw.Specialisations === "string"
           ? raw.Specialisations.split(",").map(s => s.trim()).filter(Boolean)
           : raw.specializations ?? [];
       const vet = {
         id: docSnap.id,
         ...raw,
         name, city, address, phone, openingHours, specializations,
         www: raw.www ?? raw.WWW ?? "",
         email: raw.email ?? raw.EMAIL ?? "",
         facebook: raw.facebook ?? raw.Facebook ?? "",
         instagram: raw.instagram ?? raw.Instagram ?? "",
         linkedin: raw.linkedin ?? raw.LinkedIn ?? "",
         youtube: raw.youtube ?? raw.YouTube ?? "",
       };
       setVet(vet);
      } else {
        setError("Nie znaleziono tej lecznicy.");
      }
    } catch (err) {
      console.error("Błąd pobierania lecznicy:", err);
      setError("Nie udało się pobrać danych.");
    } finally {
      setLoading(false);
    }
  };
  fetchVet();
}, [id]);


  if (loading) return <div style={{ margin: 40, color: "var(--color-text)" }}>⏳ Ładowanie danych...</div>;
  if (error) return <div style={{ margin: 40, color: "var(--color-danger)" }}>{error}</div>;
  if (!vet) return null;

  const TabButton = ({ label, refTarget }) => (
    <button
      onClick={() => refTarget.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
      style={{
        padding: "12px 16px",
        border: "none",
        borderBottom: "3px solid var(--color-primary-600)",
        background: "none",
        fontWeight: 700,
        fontSize: 16,
        color: "var(--color-primary-600)",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  const ContactDetails = () => {
    const phone = vet.phone;
    const formattedPhone = formatPhoneNumber(phone);
    const displayPhone = formatPhoneDisplay(phone);
    const validPhone = isValidPolishPhone(phone);

    return (
      <div ref={contactRef} className="vdCard vdContact">
        <div className="vdHeader">
          <h2 className="vdTitle">{vet.name}</h2>
        </div>

        <div className="vdGrid">
          {/* Adres (miasto pod nazwą — usunięte; pokazujemy pełny adres + link do mapy) */}
          {vet.address && (
            <>
              <div className="vdLabel">Adres</div>
              <div className="vdValue">
                {vet.address}
                <a
                  className="vdPillLink"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(vet.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Pokaż na mapie"
                  title="Pokaż na mapie"
                >
                  🗺️ Pokaż na mapie
                </a>
              </div>
            </>
          )}

          {/* Godziny */}
          <OpeningHours vet={vet} />

          {/* Telefon */}
          {phone && (
            <>
              <div className="vdLabel">Telefon</div>
              <div className="vdValue">
                {validPhone ? (
                  <a href={`tel:${formattedPhone}`} style={{ color: "var(--color-success)", fontWeight: 700 }}>
                    {displayPhone}
                  </a>
                ) : (
                  <span style={{ color: "var(--color-danger)" }}>Nieprawidłowy numer</span>
                )}
              </div>
            </>
          )}

          {/* Email */}
          {vet.email && (
            <>
              <div className="vdLabel">Email</div>
              <div className="vdValue">
                <a href={`mailto:${vet.email}`} style={{ color: "var(--color-primary-500)", fontWeight: 700 }}>
                  {vet.email}
                </a>
              </div>
            </>
          )}

          {/* WWW */}
          {vet.www && (
            <>
              <div className="vdLabel">WWW</div>
              <div className="vdValue">
                <a
                  href={vet.www.startsWith("http") ? vet.www : `https://${vet.www}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--color-primary-500)", fontWeight: 700 }}
                >
                  {vet.www}
                </a>
              </div>
            </>
          )}

          {/* Social media */}
          {(vet.facebook || vet.instagram || vet.linkedin || vet.youtube) && (
            <>
              <div className="vdLabel">Social media</div>
              <div className="vdValue" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {vet.facebook && (
                  <a className="vdPillLink" href={vet.facebook} target="_blank" rel="noopener noreferrer">
                    Facebook
                  </a>
                )}
                {vet.instagram && (
                  <a className="vdPillLink" href={vet.instagram} target="_blank" rel="noopener noreferrer">
                    Instagram
                  </a>
                )}
                {vet.linkedin && (
                  <a className="vdPillLink" href={vet.linkedin} target="_blank" rel="noopener noreferrer">
                    LinkedIn
                  </a>
                )}
                {vet.youtube && (
                  <a className="vdPillLink" href={vet.youtube} target="_blank" rel="noopener noreferrer">
                    YouTube
                  </a>
                )}
              </div>
            </>
          )}

          {/* Specjalizacje */}
          <div className="vdLabel">Specjalizacje</div>
          <div className="vdValue">
            {Array.isArray(vet.specializations)
              ? vet.specializations.join(", ")
              : vet.specializations || "—"}
          </div>

          {/* Cennik */}
          {vet.cennik && (
            <>
              <div className="vdLabel">Cennik</div>
              <div className="vdValue" style={{ whiteSpace: "pre-line" }}>{vet.cennik}</div>
            </>
          )}

          {/* Dodatkowe */}
          {vet.dodatkowe && (
            <>
              <div className="vdLabel">Dodatkowe informacje</div>
              <div className="vdValue" style={{ whiteSpace: "pre-line" }}>{vet.dodatkowe}</div>
            </>
          )}
        </div>

        <button
          style={editBtnStyle}
          onClick={() =>
            user
              ? navigate(`/edit-vet/${vet.id}`, { state: { vet } })
              : navigate("/login", {
                  state: { message: "Ta funkcja dostępna tylko dla zalogowanych użytkowników." },
                })
          }
        >
          Zaproponuj zmianę / uzupełnij dane
        </button>
      </div>
    );
  };

  const AppointmentCard = () => (
    <div ref={appointmentRef} className="vdCard vdSection">
      <h3>Umów wizytę w: {vet.name}</h3>
      <AppointmentForm clinicEmail={vet.email} vetName={vet.name} user={user} />
    </div>
  );

  const ReviewsCard = () => (
    <div ref={reviewsRef} className="vdCard vdSection">
      <h3>Opinie</h3>
      <Reviews vetId={vet.id} user={user} />
    </div>
  );

  return (
    <>
      {/* Sekcyjne style (karty + kontakt w formacie portalu) */}
      <style>{sectionCSS}</style>

      <div
        style={{
          maxWidth: 960,
          margin: "28px auto",
          background: "var(--color-surface-muted)",
          borderRadius: 24,
          padding: 32,
        }}
      >
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--color-border)",
            marginBottom: 28,
            gap: 8,
          }}
        >
          <TabButton label="Dane kontaktowe" refTarget={contactRef} />
          <TabButton label="Umów wizytę" refTarget={appointmentRef} />
          <TabButton label="Opinie" refTarget={reviewsRef} />
        </div>

        <ContactDetails />
        <AppointmentCard />
        <ReviewsCard />
      </div>
    </>
  );
}

// (pozostawione tylko dla guzika edycji — sekcje korzystają z klas .vdCard/.vdSection)
const editBtnStyle = {
  marginTop: 16,
  background: "var(--color-accent-500)",
  border: "var(--border-width) solid rgba(0,0,0,.04)",
  borderRadius: 10,
  fontWeight: 700,
  fontSize: 15,
  padding: "10px 16px",
  cursor: "pointer",
  color: "#14202b",
  boxShadow: "var(--shadow-sm)",
};
