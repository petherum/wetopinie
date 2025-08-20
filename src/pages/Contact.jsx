import React from "react";


export default function Contact() {
  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <style>{`
        .title{font-size:24px;margin-bottom:8px;text-align:center}
        @media(min-width:640px){.title{font-size:28px}}
        .grid{display:grid;grid-template-columns:1fr;gap:12px}
        @media(min-width:720px){.grid{grid-template-columns:1.2fr .8fr}}
        .card{border:1px solid #e1e4e8;background:#fff;border-radius:14px;padding:16px;box-shadow:0 2px 6px rgba(240,244,250,.9)}
        input,textarea{width:100%;padding:10px;border-radius:8px;border:1px solid #dfe3ea}
        button{padding:10px 14px;border-radius:10px;border:1px solid #dfe3ea;background:#f7faff}
        .muted{color:#666}
      `}</style>

      <h1 className="title">Kontakt</h1>

      <div className="grid">
        <div className="card">
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Napisz do nas</h2>
          {/* Prosty formularz bez backendu — wysyła mailto */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const subject = encodeURIComponent(form.subject.value || "Zapytanie ze strony");
              const body = encodeURIComponent(
                `Imię: ${form.name.value}\nE-mail: ${form.email.value}\n\nWiadomość:\n${form.message.value}`
              );
              window.location.href = `mailto:kontakt@twojadomena.pl?subject=${subject}&body=${body}`;
            }}
          >
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="name" className="muted">Imię</label>
              <input id="name" name="name" placeholder="Twoje imię" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="email" className="muted">E-mail</label>
              <input id="email" name="email" type="email" placeholder="twoj@email.pl" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="subject" className="muted">Temat</label>
              <input id="subject" name="subject" placeholder="Temat wiadomości" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="message" className="muted">Wiadomość</label>
              <textarea id="message" name="message" rows={5} placeholder="W czym możemy pomóc?" />
            </div>
            <button type="submit">Wyślij</button>
          </form>
        </div>

        <div className="card">
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Dane kontaktowe</h2>
          <p className="muted">Skontaktuj się z nami bezpośrednio:</p>
          <ul style={{ marginLeft: 18, lineHeight: 1.9 }}>
            <li>E-mail: <a href="mailto:kontakt@twojadomena.pl">kontakt@twojadomena.pl</a></li>
            <li>Telefon: <a href="tel:+48123456789">+48 123 456 789</a></li>
            <li>Adres: ul. Przykładowa 1, 00-000 Warszawa</li>
          </ul>
        </div>
      </div>

   
    </div>
  );
}
