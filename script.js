// FlipBook By NSA — Full Fix + Grid View Toggle
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

// DOM elements
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

// new grid button
const gridToggleBtn = document.createElement("button");
gridToggleBtn.id = "gridToggle";
gridToggleBtn.textContent = "🗂️ Grid";
document.querySelector(".navbar .nav-options").prepend(gridToggleBtn);

let pageFlip = null;
let pdfDoc = null;
let pageCount = 0;
let soundOn = true;
let pagesCache = []; // store all rendered pages for reuse
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

// ---------------- FLIPBOOK ----------------
async function initializeFlipbook() {
  try {
    showLoader("Preparing book...");
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js";

    const pdf = await pdfjsLib.getDocument("yourcourse.pdf").promise;
    pdfDoc = pdf;
    pageCount = pdf.numPages;
    pagesCache = [];

    flipbookEl.innerHTML = "";

    for (let i = 1; i <= pageCount; i++) {
      loaderText.textContent = `Rendering page ${i} of ${pageCount}...`;
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: window.devicePixelRatio > 1 ? 1.5 : 1.2 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
      const img = document.createElement("img");
      img.src = canvas.toDataURL("image/jpeg", 0.9);
      img.className = "pdf-page";
      pagesCache.push(img.src); // store image in memory

      const pageDiv = document.createElement("div");
      pageDiv.className = "page";
      pageDiv.appendChild(img);
      flipbookEl.appendChild(pageDiv);
    }

    initPageFlip();
    hideLoader();
  } catch (err) {
    hideLoader();
    alert("Error loading PDF: " + err.message);
  }
}

function initPageFlip() {
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  let bookWidth, bookHeight;
  if (screenW < 600) {
    bookWidth = screenW * 0.95;
    bookHeight = screenH * 0.95;
  } else if (screenW < 1024) {
    bookWidth = screenW * 0.9;
    bookHeight = screenH * 0.9;
  } else {
    bookWidth = Math.min(900, screenW * 0.85);
    bookHeight = Math.min(1200, screenH * 0.85);
  }

  pageFlip = new St.PageFlip(flipbookEl, {
    width: bookWidth,
    height: bookHeight,
    size: "stretch",
    showCover: true,
    usePortrait: screenW < 1024,
    mobileScrollSupport: false,
    maxShadowOpacity: 0.4,
  });

  pageFlip.loadFromHTML(document.querySelectorAll(".page"));

  if (screenW < 1024) pageFlip.update({ mode: "portrait" });
  else pageFlip.update({ mode: "book" });

  pageFlip.on("flip", (e) => {
    const current = e.data + 1;
    pageInfo.textContent = `${current} / ${pageCount}`;
    if (soundOn) flipSound.play().catch(() => {});
  });

  bindControls();
  addSwipeGestures(pageFlip);
}

// ---------------- GRID VIEW ----------------
gridToggleBtn.addEventListener("click", () => {
  if (gridMode) {
    // back to flipbook
    flipbookEl.classList.remove("grid-view");
    gridToggleBtn.textContent = "🗂️ Grid";
    flipbookEl.innerHTML = "";
    for (let src of pagesCache) {
      const div = document.createElement("div");
      div.className = "page";
      const img = document.createElement("img");
      img.src = src;
      img.className = "pdf-page";
      div.appendChild(img);
      flipbookEl.appendChild(div);
    }
    initPageFlip();
    gridMode = false;
  } else {
    // switch to grid
    gridMode = true;
    pageFlip.destroy();
    flipbookEl.classList.add("grid-view");
    flipbookEl.innerHTML = "";

    pagesCache.forEach((src, i) => {
      const thumb = document.createElement("div");
      thumb.className = "grid-item";
      thumb.innerHTML = `<img src="${src}" alt="Page ${i + 1}"><p>Page ${i + 1}</p>`;
      thumb.addEventListener("click", () => {
        gridMode = false;
        flipbookEl.classList.remove("grid-view");
        flipbookEl.innerHTML = "";
        for (let src2 of pagesCache) {
          const div = document.createElement("div");
          div.className = "page";
          const img = document.createElement("img");
          img.src = src2;
          img.className = "pdf-page";
          div.appendChild(img);
          flipbookEl.appendChild(div);
        }
        initPageFlip();
        pageFlip.turnToPage(i);
        gridToggleBtn.textContent = "🗂️ Grid";
      });
      flipbookEl.appendChild(thumb);
    });
    gridToggleBtn.textContent = "📖 Flip";
  }
});

// ---------------- CONTROLS ----------------
function bindControls() {
  document.getElementById("nextPage").addEventListener("click", () => pageFlip && pageFlip.flipNext());
  document.getElementById("prevPage").addEventListener("click", () => pageFlip && pageFlip.flipPrev());
  document.getElementById("fullscreen").addEventListener("click", () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  });
  document.getElementById("soundToggle").addEventListener("click", () => {
    soundOn = !soundOn;
    document.getElementById("soundToggle").textContent = soundOn ? "🔊" : "🔇";
  });
}

// ---------------- SWIPE ----------------
function addSwipeGestures(pageFlipInstance) {
  const el = document.getElementById("flipbook");
  let startX = 0,
    startY = 0,
    startTime = 0;
  el.addEventListener(
    "touchstart",
    (e) => {
      const t = e.changedTouches[0];
      startX = t.clientX;
      startY = t.clientY;
      startTime = Date.now();
    },
    { passive: true }
  );
  el.addEventListener(
    "touchend",
    (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const dt = Date.now() - startTime;
      if (Math.abs(dx) > 50 && Math.abs(dy) < 80 && dt < 700) {
        if (dx > 0) pageFlipInstance.flipPrev();
        else pageFlipInstance.flipNext();
        if (soundOn) flipSound.play().catch(() => {});
      }
    },
    { passive: true }
  );
}

// ---------------- HELPERS ----------------
function showLoader(text) {
  loader.classList.remove("hidden");
  loaderText.textContent = text || "Loading...";
}
function hideLoader() {
  loader.classList.add("hidden");
}

// ---------------- RESIZE ----------------
window.addEventListener("resize", () => {
  if (pageFlip && !gridMode) {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    let bookWidth, bookHeight;
    if (screenW < 600) {
      bookWidth = screenW * 0.95;
      bookHeight = screenH * 0.95;
    } else if (screenW < 1024) {
      bookWidth = screenW * 0.9;
      bookHeight = screenH * 0.9;
    } else {
      bookWidth = Math.min(900, screenW * 0.85);
      bookHeight = Math.min(1200, screenH * 0.85);
    }
    pageFlip.update({ width: bookWidth, height: bookHeight });
    if (screenW < 1024) pageFlip.update({ mode: "portrait" });
    else pageFlip.update({ mode: "book" });
  }
});
