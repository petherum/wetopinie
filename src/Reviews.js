import React, { useEffect, useMemo, useState } from "react";
import ReviewForm from "./ReviewForm";
import { auth } from "./firebase";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";

const db = getFirestore();

function toTs(value) {
  if (!value) return 0;
  try {
    if (typeof value === "number") return value;
    if (typeof value === "string") return new Date(value).getTime() || 0;
    if (value?.toDate) return value.toDate().getTime() || 0; // Firestore Timestamp
    if (value?.seconds) return value.seconds * 1000;
  } catch {}
  return 0;
}

export default function Reviews({ vetId, user }) {
  const [subcolReviews, setSubcolReviews] = useState([]); // vets/{vetId}/reviews
  const [topReviews, setTopReviews] = useState([]);       // top-level reviews with vetId
  const [pendingLocal, setPendingLocal] = useState([]);   // optimistic, “awaiting moderation”
  const [loading, setLoading] = useState(true);

  // Always use a string doc id for Firestore paths/filters
  const vetDocId = String(vetId ?? "").trim();

  // Style
  const styles = `
    .rvAlert{ background: color-mix(in srgb, var(--color-danger) 10%, #fff); border: var(--border-width) solid var(--color-border); border-radius: var(--radius-md); padding: 10px; margin-bottom: 12px; color: var(--color-danger); font-weight: 700; }
    .rvPendingBox{ background: color-mix(in srgb, var(--color-primary-500) 6%, #fff); border: var(--border-width) solid var(--color-border); border-radius: var(--radius-lg); padding: 12px; margin-bottom: 12px; color: var(--color-text); }
    .rvPendingItem{ margin-top: 10px; padding: 12px; border: 1px dashed var(--color-border); border-radius: var(--radius-md); background: #fff; }
    .rvCard{ margin-bottom: 12px; padding: 16px; border: var(--border-width) solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); box-shadow: var(--shadow-sm); color: var(--color-text); }
    .rvHead{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom: 6px; }
    .rvTitle{ font-weight:800; }
    .rvMeta{ font-size:12px; color: var(--color-text-muted); }
    .rvStars{ display:inline-flex; gap:4px; align-items:center; }
    .rvStar{ font-size: 18px; line-height:1; color: var(--color-text-muted); }
    .rvStar.isActive{ color: var(--color-primary-600); }
    .rvEmpty{ color: var(--color-text-muted); background: var(--color-surface); border: var(--border-width) solid var(--color-border); border-radius: var(--radius-md); padding: 12px; }
  `;

  // Subscribe to vets/{vetId}/reviews (approved)
  useEffect(() => {
    if (!vetDocId) return;
    setLoading(true);

    const q1 = query(
      collection(db, "vets", vetDocId, "reviews"),
      orderBy("createdAt", "desc")
    );

    const unsub1 = onSnapshot(
      q1,
      (snap) => {
        setSubcolReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("❌ Błąd pobierania opinii (subcollection):", err);
        setSubcolReviews([]);
        setLoading(false);
      }
    );
    return () => unsub1();
  }, [vetDocId]);

  // Subscribe to top-level reviews filtered by vetId (approved duplicate copy)
  useEffect(() => {
    if (!vetDocId) return;

    const q2 = query(
      collection(db, "reviews"),
      where("vetId", "==", vetDocId),
      orderBy("createdAt", "desc")
    );

    const unsub2 = onSnapshot(
      q2,
      (snap) => {
        setTopReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.error("❌ Błąd pobierania opinii (top-level):", err);
        setTopReviews([]);
      }
    );
    return () => unsub2();
  }, [vetDocId]);

  // Merge & dedupe approved reviews from both sources
  const approvedMerged = useMemo(() => {
    const map = new Map();
    const put = (r, source) => {
      const key = r.id || `${r.user || ""}|${toTs(r.createdAt) || toTs(r.approvedAt)}`;
      if (!map.has(key)) map.set(key, { ...r, _source: source });
      else {
        const existing = map.get(key);
        if (existing._source !== "sub") map.set(key, { ...r, _source: source });
      }
    };
    subcolReviews.forEach((r) => put(r, "sub"));
    topReviews.forEach((r) => put(r, "top"));

    const arr = Array.from(map.values());
    arr.sort(
      (a, b) =>
        (toTs(b.createdAt) || toTs(b.approvedAt)) -
        (toTs(a.createdAt) || toTs(a.approvedAt))
    );
    return arr;
  }, [subcolReviews, topReviews]);

  // Add review → goes to pendingReviews for moderation
  async function handleAddReview(data) {
    const reviewForPending = {
      vetId: vetDocId, // store string id consistently
      title: data.title || "Opinia",
      text: data.text || "",
      rating: Number(data.rating) || 0,
      user: auth.currentUser?.email || "Anonim",
      date: data.date || new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };

    // Optimistic UI
    setPendingLocal((prev) => [reviewForPending, ...prev]);

    try {
      await addDoc(collection(db, "pendingReviews"), reviewForPending);
      alert("✅ Opinia wysłana do moderacji. Dziękujemy!");
    } catch (err) {
      console.error("❌ Błąd zapisu opinii:", err);
      alert("Nie udało się wysłać opinii: " + err.message);
      setPendingLocal((prev) => prev.filter((r) => r !== reviewForPending));
    }
  }

  const Stars = ({ value }) => (
    <span className="rvStars" aria-label={`Ocena ${value} z 5`}>
      {[1,2,3,4,5].map((n) => (
        <span key={n} className={`rvStar ${value >= n ? "isActive" : ""}`}>★</span>
      ))}
    </span>
  );

  return (
    <div>
      <style>{styles}</style>

      {/* Review form */}
      {user ? (
        <ReviewForm onSubmit={handleAddReview} />
      ) : (
        <div className="rvAlert">
          Aby dodać opinię musisz się zalogować.
        </div>
      )}

      {/* Pending (local-only) */}
      {pendingLocal.length > 0 && (
        <div className="rvPendingBox">
          <b>Twoje opinie oczekujące na moderację:</b>
          {pendingLocal.map((r, i) => (
            <div key={`pending-${i}`} className="rvPendingItem">
              <div className="rvHead">
                <span className="rvTitle">{r.title}</span>
                <Stars value={r.rating} />
                <span className="rvMeta">(w moderacji)</span>
              </div>
              <div>{r.text}</div>
              <div className="rvMeta" style={{ marginTop: 4 }}>
                Autor: {r.user}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approved reviews (merged from both paths) */}
      {loading ? (
        <div className="rvEmpty">⏳ Ładowanie opinii...</div>
      ) : approvedMerged.length === 0 ? (
        <div className="rvEmpty">Brak opinii. Bądź pierwszą osobą, która doda opinię!</div>
      ) : (
        approvedMerged.map((r) => (
          <div key={r.id} className="rvCard">
            <div className="rvHead">
              <span className="rvTitle">{r.title || "Opinia"}</span>
              <Stars value={Number(r.rating) || 0} />
              <span className="rvMeta">
                {r.createdAt
                  ? new Date(r.createdAt).toLocaleDateString("pl-PL")
                  : r.approvedAt
                  ? new Date(r.approvedAt).toLocaleDateString("pl-PL")
                  : ""}
              </span>
            </div>
            <div>{r.text}</div>
            <div className="rvMeta" style={{ marginTop: 4 }}>
              Autor: {r.user}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
