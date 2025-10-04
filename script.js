// FlipBook By NSA — FINAL SCRIPT
// Firebase configuration
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
const gridToggleBtn = document.getElementById("gridToggle");

let pageFlip = null;
let pdfDoc = null;
let pageCount = 0;
let soundOn = true;
let pagesCache = [];
let gridMode = false;

// ---------------- AUTH ----------------
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

// ---------------- LOAD PDF ----------------
async function initializeFlipbook() {
  try {
    showLoader("Preparing book...");
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js";

    pdfDoc = await pdfjsLib.getDocument("yourcourse.pdf").promise;
    pageCount = pdfDoc.numPages;
    pagesCache = [];

    flipbookEl.innerHTML = "";

    for (let i = 1; i <= pageCount; i++) {
      loaderText.textContent = `Rendering page ${i} of ${pageCount}...`;
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: window.devicePixelRatio > 1 ? 1.5 : 1.2 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;

      const imgSrc = canvas.toDataURL("image/jpeg", 0.9);
      pagesCache.push(imgSrc);

      const div = document.createElement("div");
      div.className = "page";
      const img = document.createElement("img");
      img.src = imgSrc;
      img.className = "pdf-page";
      div.appendChild(img);
      flipbookEl.appendChild(div);
    }

    await initPageFlip();
    hideLoader();
  } catch (err) {
    hideLoader();
    alert("Error loading PDF: " + err.message);
  }
}

// ---------------- PAGEFLIP INIT ----------------
async function initPageFlip() {
  if (pageFlip && typeof pageFlip.destroy === "function") {
    try {
      pageFlip.destroy();
    } catch {}
  }

  const firstPage = await pdfDoc.getPage(1);
  const vp = firstPage.getViewport({ scale: 1 });
  const ratio = vp.height / vp.width;

  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  const isPhone = screenW < 900;

  let width = screenW * 0.95;
  let height = width * ratio;

  if (height > screenH * 0.9) {
    height = screenH * 0.9;
    width = height / ratio;
  }

  pageFlip = new St.PageFlip(flipbookEl, {
    width: Math.round(width),
    height: Math.round(height),
    size: "stretch",
    minWidth: 200,
    maxWidth: 1600,
    minHeight: 240,
    maxHeight: 2000,
    showCover: true,
    mobileScrollSupport: false,
    maxShadowOpacity: 0.45,
    usePortrait: true, // ✅ Always portrait layout internally
    mode: isPhone ? "portrait" : "book", // ✅ Single page on phones
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

// ---------------- GRID VIEW (FIXED) ----------------
gridToggleBtn.addEventListener("click", async () => {
  if (!pdfDoc) return;

  if (!gridMode) {
    // Enter grid view
    gridMode = true;
    if (pageFlip && typeof pageFlip.destroy === "function") {
      try {
        pageFlip.destroy();
      } catch {}
      pageFlip = null;
    }

    flipbookEl.classList.add("grid-view");
    flipbookEl.innerHTML = "";

    pagesCache.forEach((src, i) => {
      const item = document.createElement("div");
      item.className = "grid-item";
      item.innerHTML = `
        <img src="${src}" alt="Page ${i + 1}">
        <p>Page ${i + 1}</p>
      `;
      item.addEventListener("click", () => {
        closeGridView(i);
      });
      flipbookEl.appendChild(item);
    });

    gridToggleBtn.textContent = "📖 Flip";
  } else {
    closeGridView();
  }
});

async function closeGridView(pageToOpen = 0) {
  gridMode = false;
  flipbookEl.classList.remove("grid-view");
  flipbookEl.innerHTML = "";

  pagesCache.forEach((src) => {
    const div = document.createElement("div");
    div.className = "page";
    const img = document.createElement("img");
    img.src = src;
    img.className = "pdf-page";
    div.appendChild(img);
    flipbookEl.appendChild(div);
  });

  await initPageFlip();

  if (pageToOpen > 0) {
    setTimeout(() => pageFlip.turnToPage(pageToOpen), 300);
  }

  gridToggleBtn.textContent = "🗂️ Grid";
}

// ---------------- CONTROLS ----------------
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

// ---------------- SWIPE ----------------
function addSwipeGestures(flip) {
  let startX = 0, startY = 0, startTime = 0;
  flipbookEl.addEventListener("touchstart", (e) => {
    const t = e.changedTouches[0];
    startX = t.clientX;
    startY = t.clientY;
    startTime = Date.now();
  }, { passive: true });

  flipbookEl.addEventListener("touchend", (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const dt = Date.now() - startTime;
    if (Math.abs(dx) > 50 && Math.abs(dy) < 80 && dt < 700) {
      if (dx > 0) flip.flipPrev();
      else flip.flipNext();
      if (soundOn) flipSound.play().catch(() => {});
    }
  }, { passive: true });
}

// ---------------- HELPERS ----------------
function showLoader(msg) {
  loader.classList.remove("hidden");
  loaderText.textContent = msg || "Loading...";
}
function hideLoader() {
  loader.classList.add("hidden");
}

// ---------------- RESIZE ----------------
window.addEventListener("resize", async () => {
  if (!pdfDoc || gridMode || !pageFlip) return;

  const firstPage = await pdfDoc.getPage(1);
  const vp = firstPage.getViewport({ scale: 1 });
  const ratio = vp.height / vp.width;

  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  const isPhone = screenW < 900;

  let width = screenW * 0.95;
  let height = width * ratio;

  if (height > screenH * 0.9) {
    height = screenH * 0.9;
    width = height / ratio;
  }

  pageFlip.update({
    width: Math.round(width),
    height: Math.round(height),
    mode: isPhone ? "portrait" : "book",
  });
});

// ---------------- KEYBOARD ----------------
document.addEventListener("keydown", (e) => {
  if (!pageFlip) return;
  if (e.key === "ArrowLeft") pageFlip.flipPrev();
  if (e.key === "ArrowRight") pageFlip.flipNext();
});
