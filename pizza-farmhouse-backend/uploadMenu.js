const admin = require('firebase-admin');
const serviceAccount = require('./pizza-farmhouse-firebase-adminsdk-fbsvc-f35332f935.json');
const menuData = require('./menu.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function uploadMenu() {
  for (const category of menuData) {
    const docRef = db.collection('menu').doc(category.category);
    await docRef.set({
      category: category.category,
      items: category.items
    });
    console.log(`Uploaded: ${category.category}`);
  }
  console.log('✅ All menu data uploaded!');
  process.exit();
}

uploadMenu();
