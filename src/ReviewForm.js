import React, { useState } from "react";

// Basic list of bad words (expand as needed)
const BAD_WORDS = ["fuck", "shit", "kurwa", "chuj", "pizda", "cipa", "idiot", "idiota", "debil", "dupa", "asshole"];

export default function ReviewForm({ onSubmit, defaultDate }) {
  const [date, setDate] = useState(defaultDate || new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  function containsBadWord(str) {
    return BAD_WORDS.some(word => str.toLowerCase().includes(word));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (text.trim().length < 40) {
      setError("Opinia powinna zawierać przynajmniej 40 znaków.");
      return;
    }
    if (containsBadWord(text)) {
      setError("Opinia zawiera niedozwolone słowa. Prosimy o kulturę wypowiedzi.");
      return;
    }
    setError("");
    onSubmit({
      date,
      rating,
      title,
      text
    });
    setTitle("");
    setText("");
    setRating(5);
    setDate(new Date().toISOString().slice(0, 10));
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 18, background: "#f7faff", padding: 18, borderRadius: 10 }}>
      <div style={{ marginBottom: 8 }}>
        <b>Data wizyty:</b>{" "}
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
          style={{ padding: "4px 8px" }}
        />
      </div>
      <div style={{ marginBottom: 8 }}>
        <b>Ocena:</b>{" "}
        <select value={rating} onChange={e => setRating(e.target.value)} style={{ padding: "4px 8px" }}>
          {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} ★</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 8 }}>
        <b>Tytuł opinii:</b>{" "}
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={80}
          placeholder="Krótko podsumuj wizytę (opcjonalne)"
          style={{ width: "70%" }}
        />
      </div>
      <div style={{ marginBottom: 8 }}>
        <b>Twoja opinia:</b>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={4}
          required
          placeholder="Opisz swoje doświadczenia… Co było na plus? Co można poprawić? (minimum 40 znaków)"
          style={{ width: "100%" }}
        />
      </div>
      {error && <div style={{ color: "#b00", marginBottom: 6 }}>{error}</div>}
      <button type="submit" style={{ marginTop: 8, padding: "8px 20px" }}>Dodaj opinię</button>
    </form>
  );
}
