import React, { useState } from "react";

// Basic list of bad words (expand as needed)
const BAD_WORDS = ["fuck", "shit", "kurwa", "chuj", "pizda", "cipa", "idiot", "idiota", "debil", "dupa", "asshole"];

// Walidacja słów: pojedyncze słowo max 40 znaków
function maxWordLength(str) {
  let max = 0;
  const words = String(str).split(/\s+/).filter(Boolean);
  for (const w of words) if (w.length > max) max = w.length;
  return max;
}

export default function ReviewForm({ onSubmit, defaultDate }) {
  const [date, setDate] = useState(defaultDate || new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0); // podgląd przy najechaniu
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  function containsBadWord(str) {
    return BAD_WORDS.some((word) => str.toLowerCase().includes(word));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    const totalLen = trimmed.length;
    const longest = maxWordLength(trimmed);

    if (totalLen < 40) {
      setError("Opinia powinna zawierać minimum 40 znaków.");
      return;
    }
    if (longest > 40) {
      setError("Pojedyncze słowo może mieć maksymalnie 40 znaków.");
      return;
    }
    if (totalLen > 600) {
      setError("Opinia może mieć maksymalnie 600 znaków.");
      return;
    }
    if (containsBadWord(trimmed)) {
      setError("Opinia zawiera niedozwolone słowa. Prosimy o kulturę wypowiedzi.");
      return;
    }

    setError("");
    onSubmit({ date, rating, title, text: trimmed });

    // reset
    setTitle("");
    setText("");
    setRating(5);
    setHover(0);
    setDate(new Date().toISOString().slice(0, 10));
  }

  const chars = text.length;
  const maxChars = 600;

  const styles = `
    .rfForm{
      background: var(--color-surface);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      padding: 16px;
      margin-bottom: 18px;
    }
    .rfRow{ display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-bottom:10px; }
    .rfLabel{ font-weight:700; color: var(--color-text); min-width:120px; }
    .rfCtrl{
      padding: 8px 10px;
      border-radius: var(--radius-md);
      border: var(--border-width) solid var(--color-border);
      background: #fff; color: var(--color-text);
    }
    .rfCtrl:focus{
      outline:none; border-color: var(--focus-ring);
      box-shadow: 0 0 0 var(--focus-width) color-mix(in srgb, var(--focus-ring) 35%, transparent);
    }
    .rfText{ width:100%; resize:vertical; min-height:120px; }
    .rfError{ color: var(--color-danger); margin-bottom: 6px; font-weight:700; }
    .rfMeta{ display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:8px; }
    .rfCounter{ font-size:12px; color: var(--color-text-muted); }
    .rfBtn{
      display:inline-flex; align-items:center; justify-content:center;
      padding: 12px 16px; min-height:44px;
      border-radius: var(--radius-lg);
      border: var(--border-width) solid var(--color-border);
      background:#fff; color: var(--color-primary-700);
      font-weight:700; cursor:pointer; text-decoration:none;
    }
    .rfBtn:hover{ background: color-mix(in srgb, var(--color-primary-500) 10%, #fff); }
    .rfBtn:active{ transform: translateY(1px); }

    /* Gwiazdki (spójne z theme) */
    .stars{
      display:inline-flex; gap:4px; align-items:center;
      border: var(--border-width) solid transparent;
      border-radius: var(--radius-md);
      padding: 4px;
      background: transparent;
    }
    .star{
      font-size: 22px; line-height:1;
      background: transparent;
      border: var(--border-width) solid transparent;
      border-radius: var(--radius-sm);
      padding: 4px;
      color: var(--color-text-muted);
      cursor: pointer;
    }
    .star.isActive{ color: var(--color-primary-600); }
    .star:hover{
      background: color-mix(in srgb, var(--color-primary-500) 10%, #fff);
      border-color: var(--color-border);
    }
    .star:focus-visible{
      outline: none;
      box-shadow: 0 0 0 var(--focus-width) color-mix(in srgb, var(--focus-ring) 35%, transparent);
    }
    .starsNote{ font-size:12px; color: var(--color-text-muted); margin-left: 8px; }
  `;

  const current = hover || rating;

  return (
    <form onSubmit={handleSubmit} className="rfForm">
      <style>{styles}</style>

      <div className="rfRow">
        <label className="rfLabel" htmlFor="rfDate">Data wizyty:</label>
        <input
          id="rfDate"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="rfCtrl"
        />
      </div>

      <div className="rfRow" role="radiogroup" aria-label="Ocena w gwiazdkach">
        <div className="rfLabel">Ocena:</div>
        <div className="stars">
          {[1,2,3,4,5].map((n) => (
            <button
              key={n}
              type="button"
              className={`star ${current >= n ? "isActive" : ""}`}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} ${n === 1 ? "gwiazdka" : n < 5 ? "gwiazdki" : "gwiazdek"}`}
            >
              ★
            </button>
          ))}
          <span className="starsNote" aria-hidden="true">{rating}/5</span>
        </div>
      </div>

      <div className="rfRow">
        <label className="rfLabel" htmlFor="rfTitle">Tytuł opinii:</label>
        <input
          id="rfTitle"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder="Krótko podsumuj wizytę (opcjonalne)"
          className="rfCtrl"
          style={{ flex: 1, minWidth: 220 }}
        />
      </div>

      <div style={{ marginBottom: 8 }}>
        <label className="rfLabel" htmlFor="rfText" style={{ display: "block", marginBottom: 6 }}>
          Twoja opinia:
        </label>
        <textarea
          id="rfText"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, maxChars))}
          rows={6}
          required
          placeholder="Opisz swoje doświadczenia… Co było na plus? Co można poprawić? (min. 40 znaków, max. 600; pojedyncze słowo do 40 znaków)"
          className="rfCtrl rfText"
          maxLength={maxChars}
          aria-invalid={Boolean(error)}
        />
      </div>

      {error && <div className="rfError" role="alert">{error}</div>}

      {/* ⬇️ Zamieniona kolejność: najpierw guzik (lewa), potem licznik (prawa) */}
      <div className="rfMeta">
        <button type="submit" className="rfBtn">Dodaj opinię</button>
        <div className="rfCounter">{chars}/{maxChars}</div>
      </div>
    </form>
  );
}
