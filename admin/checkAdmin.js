const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uid = "jEqrERYJUzLZdTk45lIKJZ2LeSF3";

admin.auth().getUser(uid)
  .then(user => {
    console.log("Custom claims:", user.customClaims);
  })
  .catch(console.error);
