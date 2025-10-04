// FlipBook By NSA — Optimized Responsive Version (with Mobile Single Page Fix)

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

// ------------------------ AUTH HANDLERS ------------------------
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

// ------------------------ PDF INITIALIZATION ------------------------
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
      const viewport = page.getViewport({
        scale: window.devicePixelRatio > 1 ? 1.6 : 1.2,
      });
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

// ------------------------ PAGE FLIP INIT ------------------------
async function initPageFlip() {
  if (pageFlip && typeof pageFlip.destroy === "function") {
    try {
      pageFlip.destroy();
    } catch (e) {}
    pageFlip = null;
  }

  const isMobile = window.innerWidth <= 768;

  pageFlip = new St.PageFlip(flipbookEl, {
    width: isMobile ? window.innerWidth - 20 : 800,
    height: isMobile ? window.innerHeight - 80 : 600,
    size: "stretch",
    minWidth: 300,
    maxWidth: 1600,
    minHeight: 400,
    maxHeight: 1200,
    drawShadow: true,
    flippingTime: 700,
    usePortrait: true,
    showCover: true,
    mobileScrollSupport: false,
    singlePageMode: isMobile, // ✅ Only single page on mobile
    startPage: 1,
  });

  pageFlip.loadFromHTML(document.querySelectorAll(".page"));
  updatePageInfo();
  bindControls();

  // Responsive resize
  window.addEventListener("resize", handleResize);
}

// ------------------------ RESIZE HANDLER ------------------------
function handleResize() {
  if (!pageFlip) return;
  const isMobile = window.innerWidth <= 768;

  pageFlip.update({
    width: isMobile ? window.innerWidth - 20 : 800,
    height: isMobile ? window.innerHeight - 80 : 600,
    singlePageMode: isMobile,
  });

  flipbookEl.style.height = `${window.innerHeight - 68}px`;
}

// ------------------------ NAVIGATION ------------------------
function bindControls() {
  document.getElementById("prevPage").addEventListener("click", () => {
    pageFlip.flipPrev();
    if (soundOn) flipSound.play();
  });

  document.getElementById("nextPage").addEventListener("click", () => {
    pageFlip.flipNext();
    if (soundOn) flipSound.play();
  });

  document.getElementById("fullscreen").addEventListener("click", () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  });

  document.getElementById("soundToggle").addEventListener("click", () => {
    soundOn = !soundOn;
    document.getElementById("soundToggle").textContent = soundOn ? "🔊" : "🔇";
  });

  pageFlip.on("flip", (e) => updatePageInfo(e.data));
}

function updatePageInfo(pageNum) {
  const current = pageNum || pageFlip.getCurrentPageIndex() + 1;
  const total = pageFlip.getPageCount();
  pageInfo.textContent = `${current} / ${total}`;
}

// ------------------------ LOADER HELPERS ------------------------
function showLoader(text) {
  loader.classList.remove("hidden");
  loaderText.textContent = text || "Loading...";
}

function hideLoader() {
  loader.classList.add("hidden");
}
