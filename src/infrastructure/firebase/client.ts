import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

const firebaseConfig = {
  apiKey: "AIzaSyB6_hp0AWY3DzGQYa0Z67eTbiDRmFT8gSQ",
  authDomain: "kiosk-central-77c22.firebaseapp.com",
  projectId: "kiosk-central-77c22",
  storageBucket: "kiosk-central-77c22.firebasestorage.app",
  messagingSenderId: "757049861446",
  appId: "1:757049861446:web:84df8ea3ee675a8b2ff147",
  measurementId: "G-7EPQZ2Q6E2"
};

let clientApp: firebase.app.App;

if (!firebase.apps.length) {
  clientApp = firebase.initializeApp(firebaseConfig);
} else {
  clientApp = firebase.app();
}

export function getClientDb(): firebase.firestore.Firestore {
  return clientApp.firestore();
}

export function getClientStorage(): firebase.storage.Storage {
  return clientApp.storage();
}

