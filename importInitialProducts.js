
import { db } from './firebase.js';
import { collection, setDoc, doc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

async function importInitialProducts() {
  const res = await fetch('./initial-products.json');
  const products = await res.json();
  const col = collection(db, 'products');

  for (const product of products) {
    const id = product.name + '_' + Math.random().toString(36).substr(2, 5);
    await setDoc(doc(col, id), product);
  }

  console.log('✅ تم استيراد المنتجات بنجاح');
}

importInitialProducts();
