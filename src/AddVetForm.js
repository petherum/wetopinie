import React, { useState } from "react";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";
import { auth } from "./firebase"; // import for current user

const db = getFirestore();

const SPECIALIZATIONS = [
  "Chirurgia", "Dermatologia", "Dietetyka", "Endoskopia", "Fizjoterapia",
  "Ginekologia", "Interna", "Kardiologia", "Gastrologia", "Urologia",
  "Neurologia", "Okulistyka", "Onkologia", "Ortopedia", "Radiologia",
  "Stomatologia", "Diagnostyka laboratoryjna", "Inne specjalizacje"
];

// ---------- Helpers ----------
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

function isValidURL(value) {
  if (!value) return true;
  try {
    new URL(value.startsWith("http") ? value : "https://" + value);
    return true;
  } catch {
    return false;
  }
}

export default function AddVetForm() {
  const [form, setForm] = useState({
    name: "",
    city: "",
    address: "",
    phone: "",
    email: "",
    www: "",
    facebook: "",
    instagram: "",
    linkedin: "",
    youtube: "",
    cennik: "",
    dodatkowe: "",
    specializations: [],
    openingHours: {
      pn: { from: "", to: "" },
      wt: { from: "", to: "" },
      sr: { from: "", to: "" },
      cz: { from: "", to: "" },
      pt: { from: "", to: "" },
      sb: { from: "", to: "" },
      nd: { from: "", to: "" }
    },
  });
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

  function copyMondayToAll() {
    setForm((prev) => {
      const monday = prev.openingHours.pn;
      const newHours = Object.fromEntries(
        Object.keys(prev.openingHours).map((day) => [day, { ...monday }])
      );
      return { ...prev, openingHours: newHours };
    });
  }

  function validate() {
    let errs = {};
    if (!form.name) errs.name = true;
    if (!form.city) errs.city = true;
    if (!form.address) errs.address = true;

    const formattedPhone = formatPhoneNumber(form.phone);
    if (!form.phone) errs.phone = "Wymagane";
    else if (!isValidPolishPhone(form.phone)) errs.phone = "Nieprawidłowy numer telefonu";

    if (!form.specializations.length) errs.specializations = true;

    const oh = Object.values(form.openingHours);
    if (!oh.every(({ from, to }) => from && to)) errs.openingHours = true;

    ["www", "facebook", "instagram", "linkedin", "youtube"].forEach((f) => {
      if (form[f] && !isValidURL(form[f])) errs[f] = "Nieprawidłowy adres URL";
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ✅ Updated to match Firestore doc ID with `id` field
  async function sendToFirestore(payload) {
    try {
      const docRef = doc(collection(db, "pendingVets")); // generate auto ID
      await setDoc(docRef, {
        ...payload,
        id: docRef.id, // embed ID into document
        createdBy: auth.currentUser?.email || "Anonim",
        timestamp: new Date().toISOString(),
      });

      alert("✅ Wysłano do akceptacji. Dziękujemy!");
    } catch (err) {
      console.error("❌ Błąd zapisu do Firestore:", err);
      alert("Nie udało się wysłać danych: " + err.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      ...form,
      phone: formatPhoneNumber(form.phone),
      openingHours: Object.fromEntries(
        Object.entries(form.openingHours).map(([day, { from, to }]) => [
          day,
          from && to ? `${from} - ${to}` : "zamknięte",
        ])
      ),
    };

    await sendToFirestore(payload);

    // Reset form
    setForm({
      name: "",
      city: "",
      address: "",
      phone: "",
      email: "",
      www: "",
      facebook: "",
      instagram: "",
      linkedin: "",
      youtube: "",
      cennik: "",
      dodatkowe: "",
      specializations: [],
      openingHours: {
        pn: { from: "", to: "" },
        wt: { from: "", to: "" },
        sr: { from: "", to: "" },
        cz: { from: "", to: "" },
        pt: { from: "", to: "" },
        sb: { from: "", to: "" },
        nd: { from: "", to: "" },
      },
    });
    setErrors({});
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 480, margin: "30px auto", border: "1px solid #ccc", borderRadius: 16, padding: 24, background: "#fff" }}>
      <h2 style={{ marginBottom: 16 }}>Dodaj nową lecznicę</h2>

      <Field label="Nazwa lecznicy" name="name" value={form.name} onChange={handleChange} error={errors.name} required />
      <Field label="Miasto" name="city" value={form.city} onChange={handleChange} error={errors.city} required />
      <Field label="Adres" name="address" value={form.address} onChange={handleChange} error={errors.address} required />
      <Field label="Telefon" name="phone" value={form.phone} onChange={handleChange} error={errors.phone} required />
      <Field label="Email" name="email" value={form.email} onChange={handleChange} />
      <Field label="WWW" name="www" value={form.www} onChange={handleChange} error={errors.www} placeholder="https://..." />
      <Field label="Facebook" name="facebook" value={form.facebook} onChange={handleChange} error={errors.facebook} placeholder="https://facebook.com/..." />
      <Field label="Instagram" name="instagram" value={form.instagram} onChange={handleChange} error={errors.instagram} placeholder="https://instagram.com/..." />
      <Field label="LinkedIn" name="linkedin" value={form.linkedin} onChange={handleChange} error={errors.linkedin} placeholder="https://linkedin.com/..." />
      <Field label="YouTube" name="youtube" value={form.youtube} onChange={handleChange} error={errors.youtube} placeholder="https://youtube.com/..." />

      {/* Specjalizacje */}
      <div style={{ marginBottom: 8 }}>
        <div>Specjalizacje <span style={{ color: "#c00" }}>*</span></div>
        {SPECIALIZATIONS.map((s) => (
          <label key={s} style={{ display: "inline-block", minWidth: 120, margin: "4px 8px 4px 0" }}>
            <input type="checkbox" name={s} checked={form.specializations.includes(s)} onChange={handleChange} /> {s}
          </label>
        ))}
        {errors.specializations && <div style={{ color: "#c00", fontSize: 12 }}>Zaznacz przynajmniej jedną</div>}
      </div>

      {/* Godziny otwarcia */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Godziny otwarcia <span style={{ color: "#c00" }}>*</span></span>
          <button type="button" onClick={copyMondayToAll} style={{ fontSize: 12, background: "#eee", border: "1px solid #ccc", padding: "4px 8px", borderRadius: 4, cursor: "pointer" }}>
            Skopiuj poniedziałek do wszystkich
          </button>
        </div>
        {Object.entries(form.openingHours).map(([day, { from, to }]) => (
          <div key={day}>
            <span style={{ display: "inline-block", minWidth: 22 }}>{day.toUpperCase()}</span>
            <input type="time" name={`oh_${day}_from`} value={from} onChange={handleChange} style={{ width: 80, margin: "2px 8px" }} /> –
            <input type="time" name={`oh_${day}_to`} value={to} onChange={handleChange} style={{ width: 80, margin: "2px 8px" }} />
          </div>
        ))}
        {errors.openingHours && <div style={{ color: "#c00", fontSize: 12 }}>Wprowadź godziny dla każdego dnia</div>}
      </div>

      <Textarea label="Cennik (max 1200 znaków)" name="cennik" value={form.cennik} onChange={handleChange} maxLength={1200} />
      <Textarea label="Dodatkowe informacje (max 1200 znaków)" name="dodatkowe" value={form.dodatkowe} onChange={handleChange} maxLength={1200} />

      <button type="submit" style={{ marginTop: 12, background: "#1976d2", color: "white", border: 0, padding: "10px 30px", borderRadius: 6, fontWeight: 500, fontSize: 18 }}>
        Wyślij do akceptacji
      </button>
      <div style={{ fontSize: 14, color: "#c00", marginTop: 6 }}>* pola wymagane</div>
    </form>
  );
}

// --- Reusable Components ---
function Field({ label, name, value, onChange, error, required, placeholder }) {
  return (
    <div>
      <label>
        {label} {required && <span style={{ color: "#c00" }}>*</span>}<br />
        <input name={name} value={value} onChange={onChange} placeholder={placeholder} style={{ width: "100%", marginBottom: 8 }} />
      </label>
      {error && <div style={{ color: "#c00", fontSize: 12 }}>{typeof error === "string" ? error : "Wymagane"}</div>}
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
