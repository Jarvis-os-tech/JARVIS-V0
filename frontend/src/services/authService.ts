import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
interface FirebaseConfigOptions {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

// Safely probe for optional local config file without breaking build if gitignored or absent
const localConfigFiles = import.meta.glob<{ default: FirebaseConfigOptions }>('../../firebase-applet-config.json', {
  eager: true
});
const localConfig: FirebaseConfigOptions =
  localConfigFiles['../../firebase-applet-config.json']?.default || {};

const firebaseConfig = {
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ||
    (localConfig.projectId !== 'YOUR_FIREBASE_PROJECT_ID' ? localConfig.projectId : '') ||
    'jarvis-os-dev',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    (localConfig.appId !== 'YOUR_FIREBASE_APP_ID' ? localConfig.appId : '') ||
    '1:123456789012:web:abcdef123456',
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    (localConfig.apiKey !== 'YOUR_FIREBASE_API_KEY' ? localConfig.apiKey : '') ||
    'AIzaSy_DEV_MOCK_KEY_PLACEHOLDER',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    (localConfig.authDomain !== 'YOUR_FIREBASE_PROJECT_ID.firebaseapp.com' ? localConfig.authDomain : '') ||
    'jarvis-os-dev.firebaseapp.com',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    (localConfig.storageBucket !== 'YOUR_FIREBASE_PROJECT_ID.firebasestorage.app' ? localConfig.storageBucket : '') ||
    'jarvis-os-dev.firebasestorage.app',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    (localConfig.messagingSenderId !== 'YOUR_FIREBASE_MESSAGING_SENDER_ID' ? localConfig.messagingSenderId : '') ||
    '123456789012',
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ||
    localConfig.measurementId ||
    ''
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
provider.addScope('https://www.googleapis.com/auth/gmail.send');
provider.addScope('https://www.googleapis.com/auth/calendar.events');
provider.addScope('https://www.googleapis.com/auth/contacts.readonly');
provider.setCustomParameters({
  prompt: 'consent select_account'
});

let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initAuthListener = (
  onUserChanged: (user: User | null, token: string | null) => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      onUserChanged(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      onUserChanged(null, null);
    }
  });
};

export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string | null }> => {
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    return {
      user: result.user,
      accessToken: cachedAccessToken
    };
  } finally {
    isSigningIn = false;
  }
};

export const signOutGoogle = async (): Promise<void> => {
  cachedAccessToken = null;
  await fbSignOut(auth);
};

export const getCachedAccessToken = () => cachedAccessToken;
