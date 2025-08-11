const admin = require("firebase-admin");
const fs = require("fs");

// 🔑 Plik z Twoim kluczem serwisowym
const serviceAccount = require("./serviceAccountKey.json");

// 📥 Plik JSON z danymi
const data = require("./wetopinie_ALL_cleaned.json");

// 🔧 Inicjalizacja Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// 🕓 Normalizacja godzin otwarcia
function normalizeOpeningHours(value) {
  if (!value || value === "" || value === null) return "zamknięte";
  if (typeof value === "string" && value.toLowerCase().includes("brak")) return "brak danych";
  return value.trim();
}

// 🚀 Funkcja importująca dane do Firestore
async function importVets() {
  for (const vet of data) {
    const doc = {
      name: vet.NAME || "",
      city: vet.CITY || "",
      address: vet.Address || "",
      phone: vet.Telephone || "",
      email: vet.EMAIL || "",
      www: vet.WWW || "",
      facebook: vet.Facebook || "",
      instagram: vet.Instagram || "",
      linkedin: vet.LinkedIn || "",
      youtube: vet.YouTube || "",
      specializations: vet.Specialisations || [],
      openingHours: {
        pn: normalizeOpeningHours(vet.OpenHoursMonday),
        wt: normalizeOpeningHours(vet.OpenHoursTuesday),
        sr: normalizeOpeningHours(vet.OpenHoursWednesday),
        cz: normalizeOpeningHours(vet.OpenHoursThursday),
        pt: normalizeOpeningHours(vet.OpenHoursFriday),
        sb: normalizeOpeningHours(vet.OpenHoursSaturday),
        nd: normalizeOpeningHours(vet.OpenHoursSunday),
      },
      cennik: vet.Cennik || "",
      dodatkowe: vet["Dodatkowe Informacje"] || "",
      timestamp: new Date().toISOString(),
      lat: vet.lat || null,  // Use lat from the JSON file
      lng: vet.lng || null,  // Use lng from the JSON file
    };

    try {
      await db.collection("vets").add(doc);
      console.log(`✅ Dodano: ${doc.name}`);
    } catch (err) {
      console.error(`❌ Błąd dodawania: ${doc.name}`, err);
    }
  }

  console.log("🎉 Import zakończony.");
}

// 🟢 Uruchom
importVets();
