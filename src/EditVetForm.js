import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { getFirestore, doc, getDoc, collection, addDoc } from "firebase/firestore";
import { auth } from "./firebase";

const db = getFirestore();

const SPECIALIZATIONS = [
  "Chirurgia", "Dermatologia", "Dietetyka", "Endoskopia", "Fizjoterapia",
  "Ginekologia", "Interna", "Kardiologia", "Gastrologia", "Urologia",
  "Neurologia", "Okulistyka", "Onkologia", "Ortopedia", "Radiologia",
  "Stomatologia", "Diagnostyka laboratoryjna", "Inne specjalizacje"
];

// ---------- helpers ----------
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
  const m = formatted.match(/^\+48(\d{3})(\d{3})(\d{3})$/);
  return m ? `+48 ${m[1]} ${m[2]} ${m[3]}` : formatted;
}
function isValidPolishPhone(phone) {
  return /^\+48\d{9}$/.test(formatPhoneNumber(phone));
}

function splitToFromTo(v) {
  if (!v) return { from: "", to: "" };
  const s = String(v).replace(/\s/g, "");
  if (s.toLowerCase() === "zamknięte") return { from: "", to: "" };
  const [from = "", to = ""] = s.split("-"); // supports "13:00-15:00" or "13:00 - 15:00"
  return { from, to };
}

// convert Firestore vet -> form state
function vetToForm(vet) {
  if (!vet) return null;
  const specs = Array.isArray(vet.specializations)
    ? vet.specializations
    : typeof vet.specializations === "string"
      ? vet.specializations.split(",").map(s => s.trim()).filter(Boolean)
      : [];

  const oh = vet.openingHours || {};
  return {
    name: vet.name || "",
    city: vet.city || "",
    address: vet.address || "",
    phone: vet.phone || "",
    email: vet.email || "",
    www: vet.www || "",
    facebook: vet.facebook || "",
    instagram: vet.instagram || "",
    linkedin: vet.linkedin || "",
    youtube: vet.youtube || "",
    cennik: vet.cennik || "",
    dodatkowe: vet.dodatkowe || "",
    specializations: specs,
    openingHours: {
      pn: splitToFromTo(oh.pn),
      wt: splitToFromTo(oh.wt),
      sr: splitToFromTo(oh.sr),
      cz: splitToFromTo(oh.cz),
      pt: splitToFromTo(oh.pt),
      sb: splitToFromTo(oh.sb),
      nd: splitToFromTo(oh.nd),
    }
  };
}

// stringify opening hours back to Firestore shape
function stringifyOH(oh) {
  const entry = (d) => {
    const from = oh?.[d]?.from?.trim();
    const to = oh?.[d]?.to?.trim();
    return from && to ? `${from} - ${to}` : "zamknięte";
  };
  return {
    pn: entry("pn"),
    wt: entry("wt"),
    sr: entry("sr"),
    cz: entry("cz"),
    pt: entry("pt"),
    sb: entry("sb"),
    nd: entry("nd"),
  };
}

export default function EditVetForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation(); // may contain { vet }
  const vetFromState = state?.vet || null;

  const [vet, setVet] = useState(vetFromState);        // raw Firestore vet {id, ...data}
  const [form, setForm] = useState(() => vetToForm(vetFromState) || null);
  const [loading, setLoading] = useState(!vetFromState);
  const [error, setError] = useState("");

  // If no vet in state (e.g., refresh / direct link), fetch from Firestore
  useEffect(() => {
    if (vetFromState) return;
    (async () => {
      try {
        setLoading(true);
        const snap = await getDoc(doc(db, "vets", id));
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          setVet(data);
          setForm(vetToForm(data));
        } else {
          setError("Nie znaleziono danych lecznicy.");
        }
      } catch (e) {
        console.error("Błąd pobierania lecznicy:", e);
        setError("Nie udało się pobrać danych.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, vetFromState]);

  // validation
  function validate() {
    const errs = {};
    if (!form?.name) errs.name = true;
    if (!form?.city) errs.city = true;
    if (!form?.address) errs.address = true;

    if (!form?.phone || !isValidPolishPhone(form.phone)) {
      errs.phone = "Nieprawidłowy numer telefonu";
    }

    if (!Array.isArray(form?.specializations) || form.specializations.length === 0) {
      errs.specializations = true;
    }

    const oh = Object.values(form?.openingHours || {});
    if (!oh.every(({ from, to }) => from && to)) errs.openingHours = true;

    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    // proposed new values (normalized)
    const proposedData = {
      name: form.name.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      phone: formatPhoneNumber(form.phone),
      email: form.email?.trim() || "",
      www: form.www?.trim() || "",
      facebook: form.facebook?.trim() || "",
      instagram: form.instagram?.trim() || "",
      linkedin: form.linkedin?.trim() || "",
      youtube: form.youtube?.trim() || "",
      cennik: form.cennik || "",
      dodatkowe: form.dodatkowe || "",
      specializations: form.specializations,
      openingHours: stringifyOH(form.openingHours),
    };

    const oldData = vet || {}; // original Firestore doc data you fetched/passed via state

    const payload = {
      vetId: vet?.id || id,
      data: proposedData,
      oldData: {
        name: oldData.name || "",
        city: oldData.city || "",
        address: oldData.address || "",
        phone: oldData.phone || "",
        email: oldData.email || "",
        www: oldData.www || "",
        facebook: oldData.facebook || "",
        instagram: oldData.instagram || "",
        linkedin: oldData.linkedin || "",
        youtube: oldData.youtube || "",
        cennik: oldData.cennik || "",
        dodatkowe: oldData.dodatkowe || "",
        specializations: Array.isArray(oldData.specializations)
          ? oldData.specializations
          : (typeof oldData.specializations === "string"
              ? oldData.specializations.split(",").map(s => s.trim()).filter(Boolean)
              : []),
        openingHours: oldData.openingHours || {
          pn: "zamknięte", wt: "zamknięte", sr: "zamknięte",
          cz: "zamknięte", pt: "zamknięte", sb: "zamknięte", nd: "zamknięte"
        }
      },
      editedBy: auth.currentUser?.email || "Anonim",
      timestamp: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, "pendingVetEdits"), payload);
      alert("✅ Zmiany wysłane do akceptacji. Dziękujemy!");
      navigate(`/vet/${vet?.id || id}`);
    } catch (err) {
      console.error("Błąd zapisu zmian:", err);
      alert("❌ Nie udało się wysłać zmian: " + err.message);
    }
  }

  const [errors, setErrors] = useState({});

  function handleChange(e) {
    const { name, value, checked } = e.target;

    if (SPECIALIZATIONS.includes(name)) {
      setForm((prev) => ({
        ...prev,
        specializations: checked
          ? [...prev.specializations, name]
          : prev.specializations.filter((s) => s !== name),
      }));
    } else if (name.startsWith("oh_")) {
      const [_, day, field] = name.split("_");
      setForm((prev) => ({
        ...prev,
        openingHours: {
          ...prev.openingHours,
          [day]: { ...prev.openingHours[day], [field]: value },
        },
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  if (loading) return <div style={{ margin: 40 }}>⏳ Ładowanie danych...</div>;
  if (error)   return <div style={{ margin: 40, color: "#b00" }}>{error}</div>;
  if (!form)   return null;

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 520, margin: "30px auto", border: "1px solid #ccc", borderRadius: 16, padding: 24, background: "#fff" }}>
      <h2 style={{ marginBottom: 16 }}>Edytuj dane lecznicy</h2>

      <Field label="Nazwa lecznicy" name="name" value={form.name} onChange={handleChange} error={errors.name} required />
      <Field label="Miasto" name="city" value={form.city} onChange={handleChange} error={errors.city} required />
      <Field label="Adres" name="address" value={form.address} onChange={handleChange} error={errors.address} required />

      <div>
        <label>
          Telefon <span style={{ color: "#c00" }}>*</span><br />
          <input name="phone" value={form.phone} onChange={handleChange} style={{ width: "100%", marginBottom: 4 }} />
        </label>
        {form.phone && (
          <div style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>
            📞 Podgląd: {formatPhoneDisplay(form.phone)}
          </div>
        )}
        {errors.phone && <div style={{ color: "#c00", fontSize: 12 }}>{errors.phone}</div>}
      </div>

      <Field label="Email" name="email" value={form.email} onChange={handleChange} />
      <Field label="WWW" name="www" value={form.www} onChange={handleChange} placeholder="https://..." />
      <Field label="Facebook" name="facebook" value={form.facebook} onChange={handleChange} placeholder="https://facebook.com/..." />
      <Field label="Instagram" name="instagram" value={form.instagram} onChange={handleChange} placeholder="https://instagram.com/..." />
      <Field label="LinkedIn" name="linkedin" value={form.linkedin} onChange={handleChange} placeholder="https://linkedin.com/..." />
      <Field label="YouTube" name="youtube" value={form.youtube} onChange={handleChange} placeholder="https://youtube.com/..." />

      <div style={{ marginBottom: 8 }}>
        <div>Specjalizacje <span style={{ color: "#c00" }}>*</span></div>
        {SPECIALIZATIONS.map((s) => (
          <label key={s} style={{ display: "inline-block", minWidth: 120, margin: "4px 8px 4px 0" }}>
            <input
              type="checkbox"
              name={s}
              checked={form.specializations.includes(s)}
              onChange={handleChange}
            />{" "}
            {s}
          </label>
        ))}
        {errors.specializations && <div style={{ color: "#c00", fontSize: 12 }}>Zaznacz przynajmniej jedną</div>}
      </div>

      <div style={{ marginBottom: 8 }}>
        <div>Godziny otwarcia <span style={{ color: "#c00" }}>*</span></div>
        {Object.entries(form.openingHours).map(([day, { from, to }]) => (
          <div key={day}>
            <span style={{ display: "inline-block", minWidth: 22 }}>{day.toUpperCase()}</span>
            <input type="time" name={`oh_${day}_from`} value={from} onChange={handleChange} style={{ width: 90, margin: "2px 8px" }} /> –
            <input type="time" name={`oh_${day}_to`}   value={to}   onChange={handleChange} style={{ width: 90, margin: "2px 8px" }} />
          </div>
        ))}
        {errors.openingHours && <div style={{ color: "#c00", fontSize: 12 }}>Wprowadź godziny dla każdego dnia</div>}
      </div>

      <Textarea label="Cennik (max 1200 znaków)" name="cennik" value={form.cennik} onChange={handleChange} maxLength={1200} />
      <Textarea label="Dodatkowe informacje (max 1200 znaków)" name="dodatkowe" value={form.dodatkowe} onChange={handleChange} maxLength={1200} />

      <button type="submit" style={{ marginTop: 12, background: "#1976d2", color: "white", border: 0, padding: "10px 30px", borderRadius: 6, fontWeight: 500, fontSize: 18 }}>
        Wyślij zmiany
      </button>
      <div style={{ fontSize: 14, color: "#c00", marginTop: 6 }}>* pola wymagane</div>
    </form>
  );
}

// --- tiny components ---
function Field({ label, name, value, onChange, error, required, placeholder }) {
  return (
    <div>
      <label>
        {label} {required && <span style={{ color: "#c00" }}>*</span>}<br />
        <input name={name} value={value} onChange={onChange} placeholder={placeholder} style={{ width: "100%", marginBottom: 8 }} />
      </label>
      {error && <div style={{ color: "#c00", fontSize: 12 }}>Wymagane</div>}
    </div>
  );
}
function Textarea({ label, name, value, onChange, maxLength }) {
  return (
    <div>
      <label>
        {label}<br />
        <textarea name={name} maxLength={maxLength} value={value} onChange={onChange} style={{ width: "100%", minHeight: 50, marginBottom: 8 }} />
      </label>
    </div>
  );
}
