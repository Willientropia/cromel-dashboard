import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCx22Zwzpx4-Z6fNvpz3XPwmRmBBUk84tg",
  authDomain: "cromel-dashboard.firebaseapp.com",
  projectId: "cromel-dashboard",
  storageBucket: "cromel-dashboard.firebasestorage.app",
  messagingSenderId: "485687906786",
  appId: "1:485687906786:web:b5d6b951c8dc20632969bb",
  measurementId: "G-RF6K5PK35F"
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
