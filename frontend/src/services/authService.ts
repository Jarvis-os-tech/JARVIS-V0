import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

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
