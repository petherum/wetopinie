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

  const hasAnyHours = Object.values(vet.openingHours).some(val => val && val.trim() !== "");
  if (!hasAnyHours) return null;

  return (
    <div style={{ marginBottom: 10 }}>
      <b>Godziny otwarcia:</b>
      <table style={{ marginTop: 6, fontSize: 15 }}>
        <tbody>
          {daysOfWeek.map(day => (
            <tr key={day.key}>
              <td style={{ width: 110, fontWeight: 500 }}>{day.label}:</td>
              <td>{vet.openingHours[day.key] || "zamknięte"}</td>
            </tr>
          ))}
        </tbody>
      </table>
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

  // Fetch vet from Firestore
  useEffect(() => {
    const fetchVet = async () => {
      try {
        const docRef = doc(db, "vets", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setVet({ id: docSnap.id, ...docSnap.data() });
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

  if (loading) return <div style={{ margin: 40 }}>⏳ Ładowanie danych...</div>;
  if (error) return <div style={{ margin: 40, color: "#b00" }}>{error}</div>;
  if (!vet) return null;

  const TabButton = ({ label, refTarget }) => (
    <button
      onClick={() => refTarget.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
      style={{
        padding: "12px 24px",
        border: "none",
        borderBottom: "3px solid #2a7be4",
        background: "none",
        fontWeight: 600,
        fontSize: 18,
        color: "#2a7be4",
        cursor: "pointer"
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
      <div ref={contactRef} style={cardStyle}>
        <h2 style={{ fontSize: 26, marginBottom: 8 }}>{vet.name}</h2>
        <div style={{ fontSize: 18, marginBottom: 14, color: "#5480d7" }}>{vet.city}</div>

        {vet.address && (
          <div style={{ marginBottom: 10 }}>
            <b>Adres:</b> {vet.address}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(vet.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#007bff", textDecoration: "underline", fontSize: 13, marginLeft: 6 }}
            >
              Pokaż na mapie
            </a>
          </div>
        )}

        <OpeningHours vet={vet} />

        {phone && (
          <div style={{ marginBottom: 10 }}>
            <b>Telefon:</b>{" "}
            {validPhone ? (
              <a href={`tel:${formattedPhone}`} style={{ color: "#24ba36" }}>
                {displayPhone}
              </a>
            ) : (
              <span style={{ color: "#b00" }}>Nieprawidłowy numer</span>
            )}
          </div>
        )}

        {vet.email && (
          <div style={{ marginBottom: 10 }}>
            <b>Email:</b>{" "}
            <a href={`mailto:${vet.email}`} style={{ color: "#24ba36" }}>
              {vet.email}
            </a>
          </div>
        )}

        {vet.www && (
          <div style={{ marginBottom: 10 }}>
            <b>WWW:</b>{" "}
            <a href={vet.www.startsWith("http") ? vet.www : `https://${vet.www}`} target="_blank" rel="noopener noreferrer">
              {vet.www}
            </a>
          </div>
        )}

        {(vet.facebook || vet.instagram || vet.linkedin || vet.youtube) && (
          <div style={{ marginBottom: 10 }}>
            <b>Social media:</b>
            <span style={{ marginLeft: 8 }}>
              {vet.facebook && <a href={vet.facebook} target="_blank" rel="noopener noreferrer" style={{ marginRight: 10 }}>Facebook</a>}
              {vet.instagram && <a href={vet.instagram} target="_blank" rel="noopener noreferrer" style={{ marginRight: 10 }}>Instagram</a>}
              {vet.linkedin && <a href={vet.linkedin} target="_blank" rel="noopener noreferrer" style={{ marginRight: 10 }}>LinkedIn</a>}
              {vet.youtube && <a href={vet.youtube} target="_blank" rel="noopener noreferrer" style={{ marginRight: 10 }}>YouTube</a>}
            </span>
          </div>
        )}

        <div style={{ marginBottom: 10 }}>
          <b>Specjalizacje:</b>{" "}
          {Array.isArray(vet.specializations)
            ? vet.specializations.join(", ")
            : vet.specializations || "—"}
        </div>

        {vet.cennik && (
          <div style={{ marginBottom: 10 }}>
            <b>Cennik:</b><br />
            <span style={{ whiteSpace: "pre-line" }}>{vet.cennik}</span>
          </div>
        )}

        {vet.dodatkowe && (
          <div style={{ marginBottom: 10 }}>
            <b>Dodatkowe informacje:</b><br />
            <span style={{ whiteSpace: "pre-line" }}>{vet.dodatkowe}</span>
          </div>
        )}

        <button
          style={editBtnStyle}
          onClick={() =>
            user
              ? navigate(`/edit-vet/${vet.id}`, { state: { vet } })
              : navigate("/login", { state: { message: "Ta funkcja dostępna tylko dla zalogowanych użytkowników." } })
          }
        >
          Zaproponuj zmianę / uzupełnij dane
        </button>
      </div>
    );
  };

  const AppointmentCard = () => (
    <div ref={appointmentRef} style={cardStyle}>
      <h3 style={{ marginBottom: 12 }}>Umów wizytę w: {vet.name}</h3>
      <AppointmentForm clinicEmail={vet.email} vetName={vet.name} user={user} />
    </div>
  );

  const ReviewsCard = () => (
    <div ref={reviewsRef} style={cardStyle}>
      <h3 style={{ marginBottom: 12 }}>Opinie</h3>
      <Reviews vetId={vet.id} user={user} />
    </div>
  );

  return (
    <div style={{ maxWidth: 960, margin: "28px auto", background: "#f6faff", borderRadius: 24, padding: 32 }}>
      <div style={{ display: "flex", borderBottom: "1px solid #e0e5ef", marginBottom: 28 }}>
        <TabButton label="Dane kontaktowe" refTarget={contactRef} />
        <TabButton label="Umów wizytę" refTarget={appointmentRef} />
        <TabButton label="Opinie" refTarget={reviewsRef} />
      </div>
      <ContactDetails />
      <AppointmentCard />
      <ReviewsCard />
    </div>
  );
}

// Styles
const cardStyle = {
  background: "#fff",
  borderRadius: 18,
  boxShadow: "0 2px 12px #e5eaf1",
  padding: "24px 26px",
  marginBottom: 24
};

const editBtnStyle = {
  marginTop: 16,
  background: "#fffbe1",
  border: "1px solid #c5b317",
  borderRadius: 8,
  fontWeight: 500,
  fontSize: 15,
  padding: "7px 16px",
  cursor: "pointer",
  color: "#786500"
};
