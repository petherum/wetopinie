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
  // Try to normalize createdAt/approvedAt/timestamp/date to a number for sorting
  if (!value) return 0;
  try {
    if (typeof value === "number") return value;
    if (typeof value === "string") return new Date(value).getTime() || 0;
    // Firestore Timestamp
    if (value?.toDate) return value.toDate().getTime() || 0;
    if (value?.seconds) return value.seconds * 1000;
  } catch {}
  return 0;
}

export default function Reviews({ vetId, user }) {
  const [subcolReviews, setSubcolReviews] = useState([]); // vets/{vetId}/reviews
  const [topReviews, setTopReviews] = useState([]);       // top-level reviews with vetId
  const [pendingLocal, setPendingLocal] = useState([]);   // optimistic, “awaiting moderation”
  const [loading, setLoading] = useState(true);

  // Subscribe to vets/{vetId}/reviews (approved)
  useEffect(() => {
    if (!vetId) return;
    setLoading(true);
    const q1 = query(
      collection(db, "vets", vetId, "reviews"),
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
  }, [vetId]);

  // Subscribe to top-level reviews filtered by vetId (approved duplicate copy)
  useEffect(() => {
    if (!vetId) return;
    const q2 = query(
      collection(db, "reviews"),
      where("vetId", "==", vetId),
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
  }, [vetId]);

  // Merge & dedupe approved reviews from both sources
  const approvedMerged = useMemo(() => {
    const map = new Map();
    // prefer subcollection version if both exist; otherwise use top-level
    const put = (r, source) => {
      const key = r.id || `${r.user || ""}|${toTs(r.createdAt) || toTs(r.approvedAt)}`;
      if (!map.has(key)) {
        map.set(key, { ...r, _source: source });
      } else {
        // If both exist, prefer subcollection copy
        const existing = map.get(key);
        if (existing._source !== "sub") {
          map.set(key, { ...r, _source: source });
        }
      }
    };
    subcolReviews.forEach((r) => put(r, "sub"));
    topReviews.forEach((r) => put(r, "top"));

    const arr = Array.from(map.values());
    // sort newest first by createdAt/approvedAt
    arr.sort((a, b) => (toTs(b.createdAt) || toTs(b.approvedAt)) - (toTs(a.createdAt) || toTs(a.approvedAt)));
    return arr;
  }, [subcolReviews, topReviews]);

  // Add review → goes to pendingReviews for moderation
  async function handleAddReview(data) {
    const reviewForPending = {
      vetId,
      title: data.title || "Opinia",
      text: data.text || "",
      rating: Number(data.rating) || 0,
      user: auth.currentUser?.email || "Anonim",
      date: data.date || new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };

    // Optimistic UI: show in a “pending” box
    setPendingLocal((prev) => [reviewForPending, ...prev]);

    try {
      await addDoc(collection(db, "pendingReviews"), reviewForPending);
      alert("✅ Opinia wysłana do moderacji. Dziękujemy!");
    } catch (err) {
      console.error("❌ Błąd zapisu opinii:", err);
      alert("Nie udało się wysłać opinii: " + err.message);
      // revert optimistic item
      setPendingLocal((prev) => prev.filter((r) => r !== reviewForPending));
    }
  }

  return (
    <div>
      {/* Review form */}
      {user ? (
        <ReviewForm onSubmit={handleAddReview} />
      ) : (
        <div
          style={{
            background: "#ffe5e5",
            padding: 10,
            borderRadius: 8,
            marginBottom: 12,
            color: "#a00",
          }}
        >
          Aby dodać opinię musisz się zalogować.
        </div>
      )}

      {/* Pending (local-only) */}
      {pendingLocal.length > 0 && (
        <div
          style={{
            background: "#fff9e6",
            border: "1px solid #f0e0a0",
            padding: 10,
            borderRadius: 8,
            marginBottom: 12,
            color: "#6b5d00",
          }}
        >
          <b>Twoje opinie oczekujące na moderację:</b>
          {pendingLocal.map((r, i) => (
            <div
              key={`pending-${i}`}
              style={{
                marginTop: 10,
                padding: 12,
                border: "1px dashed #e1c97a",
                borderRadius: 8,
                background: "#fffdf6",
              }}
            >
              <b>{r.title}</b>{" "}
              <span style={{ color: "#9a8f5a", fontSize: 12 }}>(w moderacji)</span>
              <div>Ocena: {r.rating} ★</div>
              <div>{r.text}</div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                Autor: {r.user}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approved reviews (merged from both paths) */}
      {loading ? (
        <div>⏳ Ładowanie opinii...</div>
      ) : approvedMerged.length === 0 ? (
        <div>Brak opinii. Bądź pierwszą osobą, która doda opinię!</div>
      ) : (
        approvedMerged.map((r) => (
          <div
            key={r.id}
            style={{
              marginBottom: 12,
              padding: 12,
              border: "1px solid #eee",
              borderRadius: 8,
              background: "#fff",
            }}
          >
            <b>{r.title || "Opinia"}</b>{" "}
            <span style={{ color: "#aaa", fontSize: 12 }}>
              {r.createdAt
                ? new Date(r.createdAt).toLocaleDateString("pl-PL")
                : r.approvedAt
                ? new Date(r.approvedAt).toLocaleDateString("pl-PL")
                : ""}
            </span>
            <div>Ocena: {r.rating} ★</div>
            <div>{r.text}</div>
            <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
              Autor: {r.user}
            </div>
            {/* Optional: show where this one came from for debugging */}
            {/* <div style={{ fontSize: 11, color: "#999" }}>src: {r._source}</div> */}
          </div>
        ))
      )}
    </div>
  );
}
