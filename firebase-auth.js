import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

// Firebase web configuration contains public app identifiers, not a server secret.
const firebaseConfig = {
  apiKey: 'AIzaSyA1qxK01hrFa0lx8TVhG-Xwd32GpHq3dQc',
  authDomain: 'vincencio-7f0ec.firebaseapp.com',
  projectId: 'vincencio-7f0ec',
  storageBucket: 'vincencio-7f0ec.firebasestorage.app',
  messagingSenderId: '431707233472',
  appId: '1:431707233472:web:6246a04f8a8e4356d02125'
};

// Keep this empty to allow any verified Google account. Add lowercase emails here for owner-only access.
const ALLOWED_EMAILS = [];
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({prompt: 'select_account'});

const gate = document.querySelector('#auth-gate');
const app = document.querySelector('#protected-app');
const status = document.querySelector('#auth-status');
const loginButton = document.querySelector('#google-login');
const signOutButton = document.querySelector('#sign-out');
const prayerConfirm = document.querySelector('#prayer-confirm');

function studioStateRef() {
  if (!auth.currentUser) throw new Error('로그인이 필요합니다.');
  return doc(db, 'users', auth.currentUser.uid, 'studio', 'state');
}

function serializable(value) {
  return JSON.parse(JSON.stringify(value));
}

window.vincentioCloud = {
  async saveStudioState(state) {
    await setDoc(studioStateRef(), {payload: serializable(state), updatedAt: serverTimestamp()}, {merge:true});
  },
  async loadStudioState() {
    const snapshot = await getDoc(studioStateRef());
    return snapshot.exists() ? snapshot.data().payload || null : null;
  }
};

function isAllowedGoogleUser(user) {
  const isGoogleUser = user?.providerData?.some((entry) => entry.providerId === 'google.com');
  const email = user?.email?.toLowerCase();
  return Boolean(isGoogleUser && user.emailVerified && email && (!ALLOWED_EMAILS.length || ALLOWED_EMAILS.includes(email)));
}

function showStudio(user) {
  gate.classList.add('hidden');
  app.classList.remove('hidden');
  signOutButton.textContent = `${user.email} 로그아웃`;
}

function showGate(message) {
  app.classList.add('hidden');
  gate.classList.remove('hidden');
  status.textContent = prayerConfirm.checked ? message : '기도문을 읽은 뒤 입장할 수 있습니다.';
}

onAuthStateChanged(auth, (user) => {
  if (isAllowedGoogleUser(user)) {
    showStudio(user);
    document.dispatchEvent(new CustomEvent('vincentio-cloud-ready', {detail:{uid:user.uid, email:user.email}}));
    return;
  }
  if (user) {
    signOut(auth);
    showGate('이 Google 계정은 아직 허용되지 않았습니다. 관리자에게 허용을 요청하세요.');
    return;
  }
  showGate('Google 계정으로 로그인하면 제작 도구가 열립니다.');
});

prayerConfirm.addEventListener('change', () => {
  loginButton.disabled = !prayerConfirm.checked;
  if (prayerConfirm.checked) status.textContent = '마음을 준비했습니다. Google 계정으로 입장해 주세요.';
  else status.textContent = '기도문을 읽은 뒤 입장할 수 있습니다.';
});

loginButton.addEventListener('click', async () => {
  if (!prayerConfirm.checked) return;
  loginButton.disabled = true;
  status.textContent = 'Google 로그인 창을 열고 있습니다.';
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error('Firebase Google sign-in failed', error);
    const message = error?.code === 'auth/unauthorized-domain'
      ? 'Firebase 인증 설정에서 이 사이트 주소를 허용해야 합니다.'
      : '로그인하지 못했습니다. 팝업 차단을 해제한 뒤 다시 시도해 주세요.';
    showGate(message);
  } finally {
    loginButton.disabled = false;
  }
});

signOutButton.addEventListener('click', () => signOut(auth));
