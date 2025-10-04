// FlipBook By NSA — Enhanced Responsive Version (Auto single/double view)

// pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBzEhgiJXph4CbXBBwxcNU3MjDCHc0rWZo",
  authDomain: "flipbook-7540.firebaseapp.com",
  projectId: "flipbook-7540",
  storageBucket: "flipbook-7540.firebasestorage.app",
  messagingSenderId: "430421789223",
  appId: "1:430421789223:web:fdca22655543a637bf9c02",
  measurementId: "G-2T9KF0DXL5",
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// Elements
const loginOverlay = document.getElementById("loginOverlay");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const authMessage = document.getElementById("authMessage");
const loader = document.getElementById("loader");
const loaderText = document.getElementById("loaderText");
const welcomeUser = document.getElementById("welcomeUser");
const logoutBtn = document.getElementById("logoutBtn");
const flipSound = document.getElementById("flipSound");
const pageInfo = document.getElementById("pageInfo");
const flipbookEl = document.getElementById("flipbook");

let pageFlip = null;
let pdfDoc = null;
let pageCount = 0;
let soundOn = true;
let pagesCache = [];

// Auth handlers
loginBtn.addEventListener("click", async () => {
  try {
    await auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value);
    authMessage.textContent = "";
  } catch (err) {
    authMessage.textContent = err.message;
  }
});
signupBtn.addEventListener("click", async () => {
  try {
    await auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value);
    authMessage.textContent = "Account created. Please log in.";
  } catch (err) {
    authMessage.textContent = err.message;
  }
});
logoutBtn.addEventListener("click", async () => {
  await auth.signOut();
  location.reload();
});

auth.onAuthStateChanged((user) => {
  if (user) {
    loginOverlay.style.display = "none";
    logoutBtn.style.display = "inline-block";
    welcomeUser.textContent = `👋 ${user.email}`;
    initializeFlipbook();
  } else {
    loginOverlay.style.display = "flex";
    logoutBtn.style.display = "none";
    welcomeUser.textContent = "";
  }
});

// Initialize PDF
async function initializeFlipbook() {
  try {
    showLoader("Preparing book...");
    const loadingTask = pdfjsLib.getDocument("yourcourse.pdf");
    pdfDoc = await loadingTask.promise;
    pageCount = pdfDoc.numPages;
    pagesCache = [];

    flipbookEl.innerHTML = "";

    for (let i = 1; i <= pageCount; i++) {
      loaderText.textContent = `Rendering page ${i} of ${pageCount}...`;
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: window.devicePixelRatio > 1 ? 1.6 : 1.2 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      pagesCache.push(dataUrl);

      const pageDiv = document.createElement("div");
      pageDiv.className = "page";
      const img = document.createElement("img");
      img.className = "pdf-page";
      img.src = dataUrl;
      img.alt = `Page ${i}`;
      pageDiv.appendChild(img);
      flipbookEl.appendChild(pageDiv);
    }

    await initPageFlip();
    hideLoader();
  } catch (err) {
    hideLoader();
    console.error(err);
    alert("Error loading PDF: " + (err.message || err));
  }
}

// Determine mode based on screen width
function getViewMode() {
  const width = window.innerWidth;
  if (width < 900) return "portrait"; // phones — single
  if (width < 1200) return "book";    // tablets — double
  return "book";                      // desktops — double
}

// Init PageFlip
async function initPageFlip() {
  if (pageFlip && typeof pageFlip.destroy === "function") {
    try { pageFlip.destroy(); } catch (e) {}
    pageFlip = null;
  }

  const firstPage = await pdfDoc.getPage(1);
  const vp = firstPage.getViewport({ scale: 1 });
  const pageRatio = vp.height / vp.width;

  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  const isPhone = screenW < 900;

  let bookWidth = screenW * 0.95;
  let bookHeight = bookWidth * pageRatio;
  if (bookHeight > screenH * 0.9) {
    bookHeight = screenH * 0.9;
    bookWidth = bookHeight / pageRatio;
  }

  pageFlip = new St.PageFlip(flipbookEl, {
    width: Math.round(bookWidth),
    height: Math.round(bookHeight),
    size: "stretch",
    minWidth: 200,
    maxWidth: 1600,
    minHeight: 240,
    maxHeight: 2000,
    showCover: true,
    mobileScrollSupport: false,
    maxShadowOpacity: 0.45,
    usePortrait: true,
    mode: getViewMode(), // auto decide
  });

  pageFlip.loadFromHTML(document.querySelectorAll(".page"));
  pageInfo.textContent = `1 / ${pageCount}`;

  pageFlip.on("flip", (e) => {
    pageInfo.textContent = `${e.data + 1} / ${pageCount}`;
    if (soundOn) flipSound.play().catch(() => {});
  });

  bindControls();
  addSwipeGestures(pageFlip);
}

// Controls
function bindControls() {
  document.getElementById("nextPage").onclick = () => pageFlip?.flipNext();
  document.getElementById("prevPage").onclick = () => pageFlip?.flipPrev();
  document.getElementById("fullscreen").onclick = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  };
  document.getElementById("soundToggle").onclick = () => {
    soundOn = !soundOn;
    document.getElementById("soundToggle").textContent = soundOn ? "🔊" : "🔇";
  };
}

// Swipe support
function addSwipeGestures(flipInst) {
  let startX = 0, startY = 0, startTime = 0;
  flipbookEl.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    startX = t.clientX; startY = t.clientY; startTime = Date.now();
  }, { passive: true });

  flipbookEl.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - startX; const dy = t.clientY - startY;
    const dt = Date.now() - startTime;
    if (Math.abs(dx) > 50 && Math.abs(dy) < 80 && dt < 700) {
      if (dx > 0) flipInst.flipPrev();
      else flipInst.flipNext();
      if (soundOn) flipSound.play().catch(()=>{});
    }
  }, { passive: true });
}

// Loader UI
function showLoader(text) {
  loader.classList.remove('hidden');
  if (loaderText) loaderText.textContent = text || 'Loading...';
}
function hideLoader() {
  loader.classList.add('hidden');
}

// Responsive: auto re-render on resize (debounced)
let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (!pdfDoc) return;
    const newMode = getViewMode();
    if (pageFlip && pageFlip.getSettings().mode !== newMode) {
      initPageFlip(); // re-init only if mode changes
    } else if (pageFlip) {
      const firstPagePromise = pdfDoc.getPage(1).then(p => {
        const vp = p.getViewport({ scale: 1 });
        const ratio = vp.height / vp.width;
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;
        let width = screenW * 0.95;
        let height = width * ratio;
        if (height > screenH * 0.9) { height = screenH * 0.9; width = height / ratio; }
        pageFlip.update({ width: Math.round(width), height: Math.round(height) });
      });
    }
  }, 350);
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (!pageFlip) return;
  if (e.key === 'ArrowLeft') pageFlip.flipPrev();
  if (e.key === 'ArrowRight') pageFlip.flipNext();
});
