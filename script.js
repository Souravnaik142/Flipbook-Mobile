// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js";

// Firebase Config
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

let pdfDoc = null;
let pageFlip = null;
let pageCount = 0;
let soundOn = true;
let renderedPages = {};
let userPageKey = null; // stores user progress key

// === Detect View Mode ===
function getViewMode() {
  const w = window.innerWidth;
  if (w <= 768) return "single";
  if (w <= 1200) return "double";
  return "double";
}

// === Auth ===
loginBtn.onclick = async () => {
  try {
    await auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value);
    authMessage.textContent = "";
  } catch (err) {
    authMessage.textContent = err.message;
  }
};
signupBtn.onclick = async () => {
  try {
    await auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value);
    authMessage.textContent = "Account created. Please log in.";
  } catch (err) {
    authMessage.textContent = err.message;
  }
};
logoutBtn.onclick = async () => {
  await auth.signOut();
  location.reload();
};

auth.onAuthStateChanged((user) => {
  if (user) {
    loginOverlay.style.display = "none";
    logoutBtn.style.display = "inline-block";
    welcomeUser.textContent = `👋 ${user.email}`;
    userPageKey = `lastPage_${user.uid}`;
    initializeFlipbook();
  } else {
    loginOverlay.style.display = "flex";
    logoutBtn.style.display = "none";
  }
});

// === Flipbook Setup ===
async function initializeFlipbook() {
  showLoader("Loading PDF...");
  try {
    const loadingTask = pdfjsLib.getDocument("yourcourse.pdf");
    pdfDoc = await loadingTask.promise;
    pageCount = pdfDoc.numPages;
    flipbookEl.innerHTML = "";

    for (let i = 1; i <= pageCount; i++) {
      const div = document.createElement("div");
      div.className = "page";
      div.dataset.page = i;
      div.innerHTML = `<div class="page-placeholder">Loading page ${i}...</div>`;
      flipbookEl.appendChild(div);
    }

    setupPageFlip();

    // Render first few pages
    for (let i = 1; i <= Math.min(4, pageCount); i++) renderPage(i);
  } catch (err) {
    hideLoader();
    alert("Error loading PDF: " + err.message);
  }
}

function setupPageFlip() {
  const viewMode = getViewMode();
  const isPhone = viewMode === "single";
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  const bookHeight = isPhone ? screenH * 0.9 : screenH * 0.8;
  const bookWidth = isPhone ? bookHeight * 0.7 : (screenW * 0.9) / 2;

  pageFlip = new St.PageFlip(flipbookEl, {
    width: Math.round(bookWidth),
    height: Math.round(bookHeight),
    showCover: true,
    usePortrait: true,
    size: "stretch",
    viewMode,
    mobileScrollSupport: false,
    maxShadowOpacity: 0.4,
  });

  pageFlip.loadFromHTML(document.querySelectorAll(".page"));
  hideLoader();
  pageInfo.textContent = `1 / ${pageCount}`;

  // Flip events
  pageFlip.on("flip", (e) => {
    const currentPage = e.data + 1;
    pageInfo.textContent = `${currentPage} / ${pageCount}`;
    if (soundOn) flipSound.play().catch(() => {});
    for (let i = currentPage - 2; i <= currentPage + 2; i++) {
      if (i > 0 && i <= pageCount) renderPage(i);
    }
    // Save progress
    if (userPageKey) localStorage.setItem(userPageKey, currentPage);
  });

  // Resume last page
  if (userPageKey) {
    const savedPage = parseInt(localStorage.getItem(userPageKey)) || 1;
    if (savedPage > 1 && savedPage <= pageCount) {
      setTimeout(() => pageFlip.flip(s => s.toPage(savedPage - 1)), 600);
    }
  }

  bindControls();
  handleResize();
}

// === Render Page (Lazy) ===
async function renderPage(num) {
  if (renderedPages[num]) return;
  renderedPages[num] = true;

  const pageDiv = document.querySelector(`.page[data-page='${num}']`);
  if (!pageDiv) return;

  try {
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: 1.6 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const img = document.createElement("img");
    img.src = canvas.toDataURL("image/jpeg", 0.9);
    img.alt = `Page ${num}`;
    pageDiv.innerHTML = "";
    pageDiv.appendChild(img);
  } catch (err) {
    console.error("Error rendering page " + num, err);
  }
}

// === Controls ===
function bindControls() {
  document.getElementById("nextPage").onclick = () => pageFlip.flipNext();
  document.getElementById("prevPage").onclick = () => pageFlip.flipPrev();
  document.getElementById("fullscreen").onclick = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
    else document.exitFullscreen();
  };
  document.getElementById("soundToggle").onclick = () => {
    soundOn = !soundOn;
    document.getElementById("soundToggle").textContent = soundOn ? "🔊" : "🔇";
  };
}

// === Resize Smooth ===
let resizeTimeout;
function handleResize() {
  window.addEventListener("resize", () => updateFlipSmooth());
  window.addEventListener("orientationchange", () => updateFlipSmooth());
}

function updateFlipSmooth() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (!pageFlip) return;
    flipbookEl.classList.add("transitioning");
    const mode = getViewMode();
    const isPhone = mode === "single";
    const h = isPhone ? window.innerHeight * 0.9 : window.innerHeight * 0.8;
    const w = isPhone ? h * 0.7 : (window.innerWidth * 0.9) / 2;
    setTimeout(() => {
      pageFlip.update({ width: Math.round(w), height: Math.round(h), viewMode: mode });
      flipbookEl.classList.remove("transitioning");
    }, 250);
  }, 250);
}

// === Loader ===
function showLoader(text) {
  loader.classList.remove("hidden");
  loaderText.textContent = text || "Loading...";
}
function hideLoader() {
  loader.classList.add("hidden");
}
