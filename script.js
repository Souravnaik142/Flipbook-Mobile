// script.js - FlipBook By NSA (final)
// Firebase config (as provided)
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
let pagesCache = []; // dataURL strings
let gridMode = false;

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

// Auth state
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

// Initialize flipbook
async function initializeFlipbook() {
  try {
    showLoader("Preparing book...");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js";
    const loadingTask = pdfjsLib.getDocument("yourcourse.pdf");
    pdfDoc = await loadingTask.promise;
    pageCount = pdfDoc.numPages;
    pagesCache = [];

    // Clear container before adding pages
    flipbookEl.innerHTML = "";

    // Render pages to images (dataURLs) and add as .page nodes
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

      const div = document.createElement("div");
      div.className = "page";
      const img = document.createElement("img");
      img.src = dataUrl;
      img.className = "pdf-page";
      img.alt = `Page ${i}`;
      div.appendChild(img);
      flipbookEl.appendChild(div);
    }

    // Initialize PageFlip using page ratio (fixes half-page issues)
    await initPageFlip();
    hideLoader();
  } catch (err) {
    hideLoader();
    console.error(err);
    alert("Failed to load the PDF: " + (err.message || err));
  }
}

// initPageFlip computes PDF ratio from first page and sizes book accordingly
async function initPageFlip() {
  // ensure any existing instance destroyed
  if (pageFlip && typeof pageFlip.destroy === "function") {
    try { pageFlip.destroy(); } catch (e) { /* ignore */ }
    pageFlip = null;
  }

  // compute page aspect ratio using first page
  const firstPage = await pdfDoc.getPage(1);
  const vp = firstPage.getViewport({ scale: 1 });
  const pageRatio = vp.height / vp.width;

  // compute book size to fit viewport while preserving ratio
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  let bookWidth = screenW * 0.95;
  let bookHeight = bookWidth * pageRatio;

  if (bookHeight > screenH * 0.9) {
    bookHeight = screenH * 0.9;
    bookWidth = bookHeight / pageRatio;
  }

  // create PageFlip
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
    // usePortrait will make it single page on small screens
    usePortrait: screenW < 1024,
  });

  // load pages
  pageFlip.loadFromHTML(document.querySelectorAll(".page"));

  // mode: book on wide screens, portrait on small
  if (screenW < 1024) pageFlip.update({ mode: "portrait" });
  else pageFlip.update({ mode: "book" });

  // show first page in pageInfo
  pageInfo.textContent = `1 / ${pageCount}`;

  // handlers
  pageFlip.on("flip", (e) => {
    const current = e.data + 1;
    pageInfo.textContent = `${current} / ${pageCount}`;
    if (soundOn) flipSound.play().catch(() => {});
  });

  bindControls();
  addSwipeGestures(pageFlip);
}

// Controls binding
function bindControls() {
  document.getElementById("nextPage").onclick = () => pageFlip && pageFlip.flipNext();
  document.getElementById("prevPage").onclick = () => pageFlip && pageFlip.flipPrev();
  document.getElementById("fullscreen").onclick = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
    else document.exitFullscreen();
  };
  document.getElementById("soundToggle").onclick = () => {
    soundOn = !soundOn;
    document.getElementById("soundToggle").textContent = soundOn ? "🔊" : "🔇";
  };
}

// Swipe support
function addSwipeGestures(pageFlipInstance) {
  const el = flipbookEl;
  let startX = 0, startY = 0, startTime = 0;

  el.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    startX = t.clientX; startY = t.clientY; startTime = Date.now();
  }, { passive: true });

  el.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - startX, dy = t.clientY - startY;
    const dt = Date.now() - startTime;
    if (Math.abs(dx) > 50 && Math.abs(dy) < 80 && dt < 700) {
      if (dx > 0) pageFlipInstance.flipPrev();
      else pageFlipInstance.flipNext();
      if (soundOn) flipSound.play().catch(()=>{});
    }
  }, { passive: true });
}

// Grid view toggle (2-per-row). click thumb opens page in flipbook
gridToggleBtn.addEventListener('click', () => {
  if (!gridMode) openGridView();
  else closeGridView();
});

function openGridView() {
  if (!pagesCache.length) return;
  gridMode = true;
  // destroy pageFlip to avoid conflicts
  if (pageFlip && typeof pageFlip.destroy === "function") {
    try { pageFlip.destroy(); } catch(e) {}
    pageFlip = null;
  }
  flipbookEl.classList.add('grid-view');
  flipbookEl.innerHTML = '';
  pagesCache.forEach((src, idx) => {
    const item = document.createElement('div');
    item.className = 'grid-item';
    const img = document.createElement('img');
    img.src = src;
    img.alt = `Page ${idx+1}`;
    const label = document.createElement('p');
    label.textContent = `Page ${idx+1}`;
    item.appendChild(img);
    item.appendChild(label);
    item.addEventListener('click', () => {
      // show flipbook and jump to page
      closeGridView();
      // after rebuild, go to page
      const goTo = idx;
      // wait for a tick to ensure pageFlip is ready
      setTimeout(() => {
        try { pageFlip.turnToPage(goTo); }
        catch(e) { /* ignore */ }
      }, 150);
    });
    flipbookEl.appendChild(item);
  });
  gridToggleBtn.textContent = '📖 Flip';
  gridToggleBtn.setAttribute('aria-pressed', 'true');
}

function closeGridView() {
  gridMode = false;
  flipbookEl.classList.remove('grid-view');
  flipbookEl.innerHTML = '';
  pagesCache.forEach(src => {
    const div = document.createElement('div');
    div.className = 'page';
    const img = document.createElement('img');
    img.src = src;
    img.className = 'pdf-page';
    div.appendChild(img);
    flipbookEl.appendChild(div);
  });
  gridToggleBtn.textContent = '🗂️ Grid';
  gridToggleBtn.setAttribute('aria-pressed', 'false');
  // re-init pageflip
  initPageFlip();
}

// Loader helpers
function showLoader(text) {
  loader.classList.remove('hidden');
  loaderText.textContent = text || 'Loading...';
}
function hideLoader() {
  loader.classList.add('hidden');
}

// Resize handling (maintain ratio and mode)
window.addEventListener('resize', async () => {
  if (!pdfDoc) return;
  if (gridMode) return;
  if (!pageFlip) {
    // if not inited, just re-init
    initPageFlip().catch(()=>{});
    return;
  }

  // recompute ratio and size then update
  const firstPage = await pdfDoc.getPage(1);
  const vp = firstPage.getViewport({ scale: 1 });
  const pageRatio = vp.height / vp.width;
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;

  let bookWidth = screenW * 0.95;
  let bookHeight = bookWidth * pageRatio;
  if (bookHeight > screenH * 0.9) {
    bookHeight = screenH * 0.9;
    bookWidth = bookHeight / pageRatio;
  }

  pageFlip.update({ width: Math.round(bookWidth), height: Math.round(bookHeight) });
  if (screenW < 1024) pageFlip.update({ mode: 'portrait' });
  else pageFlip.update({ mode: 'book' });
});

// Keyboard nav
document.addEventListener('keydown', (e) => {
  if (!pageFlip) return;
  if (e.key === 'ArrowLeft') pageFlip.flipPrev();
  if (e.key === 'ArrowRight') pageFlip.flipNext();
});
