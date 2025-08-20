import React from "react";


export default function Privacy() {
  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <style>{`
        .title{font-size:24px;margin-bottom:8px;text-align:center}
        @media(min-width:640px){.title{font-size:28px}}
        .section{border:1px solid #e1e4e8;background:#fff;border-radius:14px;padding:16px;box-shadow:0 2px 6px rgba(240,244,250,.9);margin-bottom:16px}
        .muted{color:#666}
      `}</style>

      <h1 className="title">Polityka Prywatności</h1>
      <p className="muted" style={{ textAlign: "center", marginBottom: 16 }}>
        Ta strona opisuje, jakie dane przetwarzamy oraz w jakim celu. Tekst ma charakter informacyjny.
      </p>

      <div className="section">
        <h2 style={{ fontSize: 18, marginBottom: 6 }}>Administrator danych</h2>
        <p>
          Administratorem danych jest <b>[Twoja Nazwa/Spółka]</b>, kontakt:{" "}
          <a href="mailto:kontakt@twojadomena.pl">kontakt@twojadomena.pl</a>.
        </p>
      </div>

      <div className="section">
        <h2 style={{ fontSize: 18, marginBottom: 6 }}>Zakres i cele przetwarzania</h2>
        <ul style={{ marginLeft: 18, lineHeight: 1.7 }}>
          <li>Logi serwera i analityka w celach bezpieczeństwa i utrzymania.</li>
          <li>Dobrowolna lokalizacja użytkownika wyłącznie do wyszukiwania „w mojej okolicy”.</li>
          <li>Dane kontaktowe (np. e-mail) tylko jeśli sam/a je podasz, np. w formularzu kontaktowym.</li>
        </ul>
      </div>

      <div className="section">
        <h2 style={{ fontSize: 18, marginBottom: 6 }}>Podstawy prawne i prawa użytkownika</h2>
        <ul style={{ marginLeft: 18, lineHeight: 1.7 }}>
          <li>Art. 6 ust. 1 lit. a RODO — zgoda (np. geolokalizacja).</li>
          <li>Art. 6 ust. 1 lit. f RODO — uzasadniony interes (bezpieczeństwo, utrzymanie).</li>
          <li>Przysługuje Ci prawo dostępu, sprostowania, usunięcia, ograniczenia, sprzeciwu i skargi do PUODO.</li>
        </ul>
      </div>

      <div className="section">
        <h2 style={{ fontSize: 18, marginBottom: 6 }}>Przechowywanie i udostępnianie</h2>
        <p>
          Dane przechowujemy tak długo, jak to konieczne do realizacji celów. Nie sprzedajemy danych osobowych.
          Dostęp mogą mieć zaufani dostawcy usług (hosting, analityka) — wyłącznie w niezbędnym zakresie.
        </p>
      </div>


    </div>
  );
}
