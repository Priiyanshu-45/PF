// pizza-farmhouse-backend/setAdmin.js

const admin = require('firebase-admin');

// IMPORTANT: Make sure this is the correct path to your service account key file
const serviceAccount = require('./pizza-farmhouse-firebase-adminsdk-fbsvc-f35332f935.json'); // <-- Ensure this is your correct filename

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Get a reference to the Firestore database
const db = admin.firestore();

// Get the email from the command line argument
const email = process.argv[2];

if (!email) {
  console.log('❌ ERROR: Please provide the email address to make an admin.');
  console.log('Example: node setAdmin.js your-admin-email@example.com');
  process.exit(1);
}

console.log(`Attempting to make ${email} an admin...`);

admin.auth().getUserByEmail(email)
  .then((user) => {
    // 1. Set the custom claim { admin: true } on the user's account in Firebase Auth
    return admin.auth().setCustomUserClaims(user.uid, { admin: true })
      .then(() => {
        return user; // Pass the user object to the next .then() block
      });
  })
  .then((user) => {
    // 2. Add or update the user's document in Firestore to indicate they are an admin
    return db.collection('users').doc(user.uid).set({
      email: user.email,
      isAdmin: true, // This is what your frontend will read
    }, { merge: true }); // 'merge: true' ensures you only update this field without overwriting other user data
  })
  .then(() => {
    console.log(`✅ Success! Custom claim set for ${email}. They are now an admin.`);
    console.log('Remember to re-login on the frontend to get the new custom token.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error setting custom claim or writing to Firestore:', error.message);
    process.exit(1);
  });