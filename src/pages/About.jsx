import React from "react";

export default function About() {
  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <style>{`
        .title{font-size:24px;margin-bottom:8px;text-align:center}
        @media(min-width:640px){.title{font-size:28px}}
        .lead{color:#555;text-align:center;margin-bottom:20px}
        .card{border:1px solid #e1e4e8;background:#fff;border-radius:14px;padding:16px;box-shadow:0 2px 6px rgba(240,244,250,.9)}
      `}</style>

      <h1 className="title">O Nas</h1>
      <p className="lead">
        Tworzymy wyszukiwarkę lecznic weterynaryjnych, która pomaga szybko znaleźć
        odpowiednią pomoc dla Twojego pupila — blisko, teraz, i z właściwą specjalizacją.
      </p>

      <div className="card">
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Co nas wyróżnia</h2>
        <ul style={{ marginLeft: 18, lineHeight: 1.7 }}>
          <li>Filtrowanie po odległości, godzinach otwarcia i specjalizacjach.</li>
          <li>Projekt mobilny: szybki podgląd kluczowych informacji i „kliknij-zadzwoń”.</li>
          <li>Aktualne dane z bazy oraz przejrzysty interfejs.</li>
        </ul>
      </div>

         </div>
  );
}
