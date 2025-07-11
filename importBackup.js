import { db } from './firebase.js';
import {
  collection,
  setDoc,
  doc
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

async function importBackup(data) {
  const collections = Object.entries(data);

  for (const [collectionName, docs] of collections) {
    if (!docs || typeof docs !== 'object') continue;

    for (const [docId, docData] of Object.entries(docs)) {
      try {
        const ref = doc(db, collectionName, docId);
        await setDoc(ref, docData);
        console.log(`✅ Imported into ${collectionName}/${docId}`);
      } catch (e) {
        console.error(`❌ Failed to import ${collectionName}/${docId}`, e);
      }
    }
  }
}

// مثال على طريقة الاستخدام
// fetch('backup_2025-07-10.json')
//   .then(res => res.json())
//   .then(importBackup);