import React, { useState } from "react";

export default function AppointmentForm({ clinicEmail, vetName, user }) {
  const [userName, setUserName] = useState(user?.displayName || "");
  const [petType, setPetType] = useState("");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");

  const disabled = !user || !clinicEmail;

  function handleSubmit(e) {
    e.preventDefault();
    if (!user) return;
    if (!clinicEmail) return;
    const userEmail = user.email || "";
    // Prepare email body
    const mailSubject = encodeURIComponent(`Prośba o wizytę: ${vetName}`);
    const mailBody = encodeURIComponent(
      `Imię i nazwisko: ${userName}\nEmail: ${userEmail}\nTyp zwierzaka: ${petType}\nPreferowana data/godzina: ${date}\n\nWiadomość:\n${message}`
    );
    window.location.href = `mailto:${clinicEmail}?subject=${mailSubject}&body=${mailBody}`;
    setStatus("Prośba o wizytę została przygotowana w Twoim programie pocztowym.");
  }

  return (
    <div style={{ marginTop: 32, padding: 16, border: "1px solid #ccc", borderRadius: 10, background: "#fafbfc" }}>
      <h4>Umów wizytę online {vetName ? `w: ${vetName}` : ""}</h4>
      {!clinicEmail && (
        <div style={{ color: "#b00", marginBottom: 12 }}>Brak adresu email do tej lecznicy.</div>
      )}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 8 }}>
          <label>
            <b>Imię i nazwisko:</b>{" "}
            <input
              type="text"
              value={userName}
              onChange={e => setUserName(e.target.value)}
              required
              disabled={disabled}
              style={{
                minWidth: 220,
                padding: 4,
                borderRadius: 4,
                border: "1px solid #aaa",
                background: disabled ? "#eee" : "#fff"
              }}
            />
          </label>
        </div>
        <div style={{ marginBottom: 8 }}>
          <b>Email:</b>{" "}
          <input
            type="email"
            value={user?.email || ""}
            disabled
            style={{
              minWidth: 220,
              padding: 4,
              borderRadius: 4,
              border: "1px solid #aaa",
              background: "#eee"
            }}
          />
        </div>
        <label>
          Typ zwierzaka:{" "}
          <select value={petType} onChange={e => setPetType(e.target.value)} required disabled={disabled}>
            <option value="">--wybierz--</option>
            <option value="Pies">Pies</option>
            <option value="Kot">Kot</option>
            <option value="Królik">Królik</option>
            <option value="Inne">Inne</option>
          </select>
        </label>
        <br />
        <label style={{ marginTop: 8, display: "block" }}>
          Preferowana data i godzina wizyty:{" "}
          <input
            type="datetime-local"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            disabled={disabled}
            style={{ minWidth: 180 }}
          />
        </label>
        <br />
        <label style={{ marginTop: 8, display: "block" }}>
          Dodatkowa wiadomość: <br />
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            placeholder="Np. powód wizyty, dodatkowe pytania"
            style={{ width: "100%" }}
            disabled={disabled}
          />
        </label>
        <button type="submit" style={{ marginTop: 10 }} disabled={disabled}>
          Wyślij prośbę
        </button>
        {(!user || !clinicEmail) && (
          <div style={{ color: "#b00", marginTop: 10 }}>
            { !user
              ? "Ta funkcja dostępna tylko dla zalogowanych użytkowników."
              : "Brak adresu email do tej lecznicy." }
          </div>
        )}
        {status && user && clinicEmail && (
          <div style={{ color: "#19a119", marginTop: 10 }}>{status}</div>
        )}
      </form>
      <div style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
        Po kliknięciu “Wyślij prośbę” otworzy się Twój program pocztowy z gotowym emailem.
      </div>
    </div>
  );
}
