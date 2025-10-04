// ✅ FlipBook By NSA — Full Version for GitHub Pages
// PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js";

// 🔹 Firebase Config
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

// 🔹 Elements
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
const backToTopBtn = document.getElementById("backToTop");

let pageFlip = null;
let pdfDoc = null;
let pageCount = 0;
let soundOn = true;
let pagesCache = [];
let gridMode = false;

// ✅ AUTH HANDLERS
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

// ✅ LOAD PDF
async function initializeFlipbook() {
  try {
    showLoader("Preparing book...");
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

// ✅ INITIALIZE PAGE FLIP
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
    usePortrait: true,
    mode: isPhone ? "portrait" : "book",
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

// ✅ GRID VIEW (fade-in)
gridToggleBtn.addEventListener("click", async () => {
  if (!pdfDoc) return;

  if (!gridMode) {
    gridMode = true;

    try {
      if (pageFlip) {
        pageFlip.destroy();
        pageFlip = null;
      }
    } catch {}

    flipbookEl.classList.add("grid-view");
    flipbookEl.innerHTML = "";
    flipbookEl.style.opacity = "0";
    setTimeout(() => (flipbookEl.style.opacity = "1"), 50);

    for (let i = 0; i < pagesCache.length; i++) {
      const src = pagesCache[i];
      const item = document.createElement("div");
      item.className = "grid-item fade-in";

      const img = document.createElement("img");
      img.src = src;
      img.alt = `Page ${i + 1}`;
      const label = document.createElement("p");
      label.textContent = `Page ${i + 1}`;

      item.appendChild(img);
      item.appendChild(label);
      item.addEventListener("click", async () => {
        await closeGridView(i);
      });

      flipbookEl.appendChild(item);
    }

    gridToggleBtn.textContent = "📖 Flip";
  } else {
    await closeGridView();
  }
});

async function closeGridView(pageToOpen = 0) {
  gridMode = false;
  flipbookEl.classList.remove("grid-view");
  flipbookEl.innerHTML = "";
  flipbookEl.style.opacity = "1";

  for (let src of pagesCache) {
    const div = document.createElement("div");
    div.className = "page";
    const img = document.createElement("img");
    img.src = src;
    img.className = "pdf-page";
    div.appendChild(img);
    flipbookEl.appendChild(div);
  }

  await initPageFlip();

  if (pageToOpen > 0) {
    setTimeout(() => {
      try {
        pageFlip.turnToPage(pageToOpen);
      } catch {}
    }, 350);
  }

  gridToggleBtn.textContent = "🗂️ Grid";
}

// ✅ BACK TO TOP BUTTON (auto-hide)
let lastScrollY = 0;
let scrollTimeout;

flipbookEl.addEventListener("scroll", () => {
  if (!gridMode) {
    backToTopBtn.style.display = "none";
    return;
  }

  const currentScroll = flipbookEl.scrollTop;

  if (currentScroll > 300) {
    backToTopBtn.style.display = "flex";
  } else {
    backToTopBtn.style.display = "none";
  }

  if (currentScroll > lastScrollY) {
    backToTopBtn.classList.add("hide");
  } else {
    backToTopBtn.classList.remove("hide");
  }

  lastScrollY = currentScroll;

  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    if (gridMode && flipbookEl.scrollTop > 300) {
      backToTopBtn.classList.remove("hide");
    }
  }, 500);
});

backToTopBtn.addEventListener("click", () => {
  flipbookEl.scrollTo({ top: 0, behavior: "smooth" });
});

// ✅ CONTROLS
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

// ✅ SWIPE
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

// ✅ HELPERS
function showLoader(msg) {
  loader.classList.remove("hidden");
  loaderText.textContent = msg || "Loading...";
}
function hideLoader() {
  loader.classList.add("hidden");
}

// ✅ RESIZE
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

// ✅ KEYBOARD
document.addEventListener("keydown", (e) => {
  if (!pageFlip) return;
  if (e.key === "ArrowLeft") pageFlip.flipPrev();
  if (e.key === "ArrowRight") pageFlip.flipNext();
});
