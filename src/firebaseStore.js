import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, getDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "./firebase";
import { signInAnonymously } from "firebase/auth";

const productsRef = () => {
  if (!db) throw new Error("Firebase is not configured. Check your .env.local values.");
  return collection(db, "products");
};

export async function isAdminUser(uid) {
  if (!db || !uid) return false;
  const adminSnap = await getDoc(doc(db, "admins", uid));
  return adminSnap.exists() && adminSnap.data()?.role === "admin";
}

export function subscribeToProducts(callback, onError = console.error) {
  return onSnapshot(
    query(productsRef(), orderBy("createdAt", "desc")),
    snapshot => callback(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))),
    onError
  );
}

export async function createProduct(product) {
  const { id, ...data } = product;
  return addDoc(productsRef(), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function updateProduct(productId, product) {
  const { id, ...data } = product;
  return updateDoc(doc(db, "products", productId), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteProduct(productId) {
  return deleteDoc(doc(db, "products", productId));
}

export async function uploadProductImage(file) {
  if (!storage) throw new Error("Firebase Storage is not configured.");
  if (!file || !file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image must be smaller than 5 MB.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const imageRef = ref(storage, `products/${Date.now()}-${safeName}`);
  await uploadBytes(imageRef, file, { contentType: file.type });
  return getDownloadURL(imageRef);
}


/**
 * Creates a COD order. Customers use Firebase anonymous auth so orders have
 * an authenticated owner without exposing admin privileges or collecting passwords.
 * Enable Authentication > Sign-in method > Anonymous in Firebase Console.
 */
export async function createOrder(order) {
  if (!db || !auth) throw new Error("Firebase is not configured.");
  let customerUser = auth.currentUser;
  if (!customerUser) {
    const credential = await signInAnonymously(auth);
    customerUser = credential.user;
  }
  const orderRef = await addDoc(collection(db, "orders"), {
    ...order,
    userId: customerUser.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return orderRef.id;
}

export function subscribeToOrders(callback, onError = console.error) {
  if (!db) throw new Error("Firebase is not configured.");
  return onSnapshot(
    query(collection(db, "orders"), orderBy("createdAt", "desc")),
    snapshot => callback(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))),
    onError
  );
}

export async function updateOrderStatus(orderId, status) {
  if (!db) throw new Error("Firebase is not configured.");
  const allowed = ["New", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled"];
  if (!allowed.includes(status)) throw new Error("Invalid order status.");
  return updateDoc(doc(db, "orders", orderId), {
    status,
    updatedAt: serverTimestamp()
  });
}
