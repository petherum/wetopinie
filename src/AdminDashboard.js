import React, { useEffect, useState } from "react";
import { auth } from "./firebase";
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  addDoc,
  writeBatch,
} from "firebase/firestore";

const db = getFirestore();

export default function AdminDashboard({ user }) {
  const [pendingVets, setPendingVets] = useState([]);
  const [pendingVetEdits, setPendingVetEdits] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [logs, setLogs] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function convertTimestamp(ts) {
    if (!ts) return "Brak daty";
    if (typeof ts === "string") return new Date(ts).toLocaleString();
    if (ts.toDate) return ts.toDate().toLocaleString();
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
    return "Nieznany format";
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.isAdmin) return;
      try {
        setLoading(true);
        await auth.currentUser.getIdToken(true);

        const vetsSnapshot = await getDocs(collection(db, "pendingVets"));
        setPendingVets(vetsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));

        const editsSnapshot = await getDocs(collection(db, "pendingVetEdits"));
        setPendingVetEdits(editsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));

        const reviewsSnapshot = await getDocs(collection(db, "pendingReviews"));
        setPendingReviews(reviewsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));

        const logsSnapshot = await getDocs(collection(db, "moderationLogs"));
        setLogs(logsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("🔥 Błąd Firestore:", err);
        setError("Nie udało się pobrać danych: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleApprove = async (collectionName, item) => {
    const batch = writeBatch(db); // Use writeBatch to create the batch write

    try {
      if (collectionName === "pendingVets") {
        // 1. Add new vet point (dodaj lecznicę)
        const vetRef = doc(db, "vets", item.id);
        batch.set(vetRef, {
          ...item,
          approvedAt: new Date().toISOString(),
          lat: item.lat || null, // Ensure lat is included
          lng: item.lng || null, // Ensure lng is included
        });
      } else if (collectionName === "pendingVetEdits") {
        // 2. Update existing vet point (zapropożuj zmianę / uzupełnij dane)
        const vetRef = doc(db, "vets", item.vetId);

        // Merge the updated data into the existing vet document
        batch.set(
          vetRef,
          { ...item.data, updatedAt: new Date().toISOString(), lat: item.lat || null, lng: item.lng || null },
          { merge: true }
        );
      } else if (collectionName === "pendingReviews") {
        // ✅ Save approved review under vets/{vetId}/reviews/{reviewId}
        if (!item.vetId) {
          throw new Error("Brak vetId w opinii – nie można zatwierdzić.");
        }

        const reviewId = item.id || undefined; // use pending ID if present
        const reviewRef =
          reviewId
            ? doc(db, "vets", item.vetId, "reviews", reviewId)
            : doc(collection(db, "vets", item.vetId, "reviews"));

        const reviewData = {
          id: reviewRef.id,
          vetId: item.vetId,
          user: item.user,
          rating: Number(item.rating) || 0,
          text: item.text || "",
          title: item.title || "Opinia",
          createdAt: item.timestamp || item.date || new Date().toISOString(),
          approvedAt: new Date().toISOString(),
        };

        // Write to vets/{vetId}/reviews/{reviewId}
        batch.set(reviewRef, reviewData);

        // Write to reviews/{reviewId}
        const globalReviewRef = doc(db, "reviews", reviewRef.id);
        batch.set(globalReviewRef, reviewData);
      }

      // Commit the batch to execute all writes atomically
      await batch.commit();

      // Remove from pending
      await deleteDoc(doc(db, collectionName, item.id));

      // Log the moderation action
      await addDoc(collection(db, "moderationLogs"), {
        action: "approved",
        collection: collectionName,
        itemId: item.id,
        timestamp: new Date().toISOString(),
        admin: user.email,
      });

      alert("✅ Zatwierdzono i przeniesiono!");
      window.location.reload();
    } catch (err) {
      console.error("Błąd zatwierdzania:", err);
      alert("❌ Błąd: " + err.message);
    }
  };

  const handleReject = async (collectionName, item) => {
    try {
      await deleteDoc(doc(db, collectionName, item.id));
      await addDoc(collection(db, "moderationLogs"), {
        action: "rejected",
        collection: collectionName,
        itemId: item.id,
        timestamp: new Date().toISOString(),
        admin: user.email,
      });
      alert("❌ Odrzucono!");
      window.location.reload();
    } catch (err) {
      console.error("Błąd odrzucania:", err);
      alert("❌ Błąd: " + err.message);
    }
  };

  if (!user?.isAdmin) {
    return (
      <div style={{ margin: 40, color: "#b00", fontWeight: "bold" }}>
        🚫 Brak uprawnień.
      </div>
    );
  }

  if (loading) return <div style={{ margin: 40 }}>⏳ Ładowanie danych...</div>;
  if (error)
    return (
      <div style={{ margin: 40, color: "#b00" }}>
        <b>Błąd:</b> {error}
      </div>
    );

  return (
    <div style={{ maxWidth: 1000, margin: "30px auto", padding: 20 }}>
      <h1>📊 Panel administracyjny</h1>

      {/* Nowe lecznice */}
      <Section
        title="🩺 Oczekujące nowe lecznice"
        data={pendingVets}
        collectionName="pendingVets"
        onApprove={handleApprove}
        onReject={handleReject}
        expanded={expanded}
        toggleExpand={toggleExpand}
        type="vet"
      />

      {/* Edycje istniejących lecznic */}
      <Section
        title="✏️ Oczekujące zmiany w danych lecznic"
        data={pendingVetEdits}
        collectionName="pendingVetEdits"
        onApprove={handleApprove}
        onReject={handleReject}
        expanded={expanded}
        toggleExpand={toggleExpand}
        type="edit"
      />

      {/* Opinie */}
      <Section
        title="💬 Oczekujące opinie"
        data={pendingReviews}
        collectionName="pendingReviews"
        onApprove={handleApprove}
        onReject={handleReject}
        expanded={expanded}
        toggleExpand={toggleExpand}
        type="review"
      />

      {/* Logi */}
      <section style={{ marginTop: 30 }}>
        <h2>📜 Logi moderacji</h2>
        {logs.length === 0 ? (
          <p>Brak logów.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} style={logStyle}>
              [{convertTimestamp(log.timestamp)}] <b>{log.admin}</b> – {log.action} → {log.collection}/{log.itemId}
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function Section({
  title,
  data,
  collectionName,
  onApprove,
  onReject,
  expanded,
  toggleExpand,
  type,
}) {
  return (
    <section style={{ marginTop: 30 }}>
      <h2>{title}</h2>
      {data.length === 0 ? (
        <p>Brak rekordów.</p>
      ) : (
        data.map((item) => {
          const hasProfanity =
            type === "review" && /kurwa|chuj|pierd/i.test(item.text || "");

          return (
            <div key={item.id} style={cardStyle}>
              <div style={{ flex: 1 }}>
                {type === "vet" && (
                  <>
                    <b>{item.name}</b> – {item.city} <br />
                    <button onClick={() => toggleExpand(item.id)} style={detailsBtn}>
                      {expanded[item.id] ? "▲ Ukryj szczegóły" : "▼ Pokaż szczegóły"}
                    </button>
                    {expanded[item.id] && (
                      <div style={detailsBox}>
                        <p><b>Adres:</b> {highlightMissing(item.address)}</p>
                        <p><b>Telefon:</b> {highlightMissing(item.phone)}</p>
                        <p><b>Email:</b> {highlightMissing(item.email)}</p>
                        <p><b>Specjalizacje:</b> {item.specializations?.join(", ") || highlightMissing(null)}</p>
                        <p><b>Cennik:</b> {item.cennik || highlightMissing(null)}</p>
                        <p><b>Godziny otwarcia:</b> {JSON.stringify(item.openingHours)}</p>
                      </div>
                    )}
                  </>
                )}

                {type === "edit" && (
                  <>
                    <b>Edycja dla lecznicy ID:</b> {item.vetId} <br />
                    <button onClick={() => toggleExpand(item.id)} style={detailsBtn}>
                      {expanded[item.id] ? "▲ Ukryj zmiany" : "▼ Pokaż zmiany"}
                    </button>
                    {expanded[item.id] && (
                      <div style={detailsBox}>
                        {Object.keys(item.data || {}).map((field) => {
                          const newValue = item.data[field];
                          const oldValue = item.oldData?.[field] ?? "—";
                          const isChanged = JSON.stringify(newValue) !== JSON.stringify(oldValue);

                          return (
                            <div key={field} style={{ marginBottom: "6px" }}>
                              <b>{field}:</b>{" "}
                              {isChanged ? (
                                <>
                                  <span style={oldValueStyle}>{formatValue(oldValue)}</span> ➜{" "}
                                  <span style={newValueStyle}>{formatValue(newValue)}</span>
                                </>
                              ) : (
                                <span>{formatValue(newValue)}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {type === "review" && (
                  <>
                    <b>{item.title || "Opinia"}</b> – Ocena: {item.rating} ★
                    {hasProfanity && (
                      <span style={{ color: "#b00", marginLeft: 8 }}>
                        ⚠️ Podejrzenie wulgaryzmów
                      </span>
                    )}
                    <br />
                    <button onClick={() => toggleExpand(item.id)} style={detailsBtn}>
                      {expanded[item.id] ? "▲ Ukryj" : "▼ Pokaż"}
                    </button>
                    {expanded[item.id] && (
                      <div style={detailsBox}>
                        <p><b>Treść:</b> {item.text}</p>
                        <p><b>Autor:</b> {item.user}</p>
                        <p><b>Data:</b> {item.timestamp ? new Date(item.timestamp).toLocaleString() : "—"}</p>
                        <p><b>VetID:</b> {item.vetId || <span style={{ color: "#b00" }}>brak</span>}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div>
                <button onClick={() => onApprove(collectionName, item)} style={approveBtn}>✅</button>
                <button onClick={() => onReject(collectionName, item)} style={rejectBtn}>❌</button>
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}

function highlightMissing(value) {
  return value ? value : <span style={{ color: "#b00", fontStyle: "italic" }}>❗ Brak danych</span>;
}

function formatValue(value) {
  return typeof value === "object" ? JSON.stringify(value) : value || "—";
}

// Styles
const cardStyle = {
  background: "#fff",
  border: "1px solid #ddd",
  padding: "12px 16px",
  borderRadius: 8,
  marginBottom: 10,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
};
const detailsBox = {
  background: "#f9f9f9",
  border: "1px solid #eee",
  padding: "8px",
  marginTop: "8px",
  borderRadius: "6px",
  fontSize: "14px",
};
const detailsBtn = {
  marginTop: "6px",
  background: "#eef",
  border: "1px solid #99c",
  padding: "4px 8px",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "13px",
};
const logStyle = {
  background: "#f9f9f9",
  border: "1px solid #eee",
  padding: "8px 10px",
  borderRadius: 6,
  marginBottom: 6,
  fontSize: 13,
};
const approveBtn = {
  marginRight: 8,
  background: "#4caf50",
  color: "#fff",
  border: "none",
  padding: "5px 10px",
  borderRadius: 4,
  cursor: "pointer",
};
const rejectBtn = {
  background: "#f44336",
  color: "#fff",
  border: "none",
  padding: "5px 10px",
  borderRadius: 4,
  cursor: "pointer",
};
const oldValueStyle = {
  color: "#b00",
  textDecoration: "line-through",
  marginRight: "6px",
};
const newValueStyle = {
  color: "#090",
  fontWeight: "bold",
};
