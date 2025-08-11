const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uid = "jEqrERYJUzLZdTk45lIKJZ2LeSF3"; // ✅ Your UID

admin.auth().setCustomUserClaims(uid, { isAdmin: true })
  .then(() => {
    console.log(`✅ User ${uid} is now an admin!`);
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
