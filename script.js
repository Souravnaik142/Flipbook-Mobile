// FlipBook By NSA — Fixed version (Single/Dual Page View)
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

// DOM references
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

let pageFlip = null;
let pdfDoc = null;
let pageCount = 0;
let soundOn = true;

// ------------------ AUTH ------------------
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  try {
    await auth.signInWithEmailAndPassword(email, password);
    authMessage.textContent = "";
  } catch (err) {
    authMessage.textContent = err.message;
  }
});

signupBtn.addEventListener("click", async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  try {
    await auth.createUserWithEmailAndPassword(email, password);
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

// ------------------ FLIPBOOK ------------------
async function initializeFlipbook() {
  try {
    showLoader("Preparing book...");
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js";

    const pdf = await pdfjsLib.getDocument("yourcourse.pdf").promise;
    pdfDoc = pdf;
    pageCount = pdf.numPages;

    const flipbookEl = document.getElementById("flipbook");
    flipbookEl.innerHTML = "";

    // Render all pages to <div class="page"><img ...></div>
    for (let i = 1; i <= pageCount; i++) {
      loaderText.textContent = `Rendering page ${i} of ${pageCount}...`;
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: window.devicePixelRatio > 1 ? 1.6 : 1.2 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;

      const img = document.createElement("img");
      img.src = canvas.toDataURL("image/jpeg", 0.85);
      img.className = "pdf-page";

      const pageDiv = document.createElement("div");
      pageDiv.className = "page";
      pageDiv.appendChild(img);
      flipbookEl.appendChild(pageDiv);
    }

    // ✅ Initialize PageFlip AFTER pages are added
    pageFlip = new St.PageFlip(flipbookEl, {
      width: Math.min(window.innerWidth * 0.9, 800),
      height: Math.min(window.innerHeight * 0.8, 1000),
      size: "stretch",
      showCover: true,
      mobileScrollSupport: false,
      maxShadowOpacity: 0.4,
    });

    pageFlip.loadFromHTML(document.querySelectorAll(".page"));

    // ✅ Adjust mode (single page on mobile, book on tablet/desktop)
    if (window.innerWidth > 900) {
      pageFlip.update({ mode: "book" });
    } else {
      pageFlip.update({ mode: "portrait" });
    }

    pageFlip.on("flip", (e) => {
      const current = e.data + 1;
      pageInfo.textContent = `${current} / ${pageCount}`;
      if (soundOn) flipSound.play().catch(() => {});
    });

    bindControls();
    addSwipeGestures(pageFlip);
    hideLoader();
  } catch (err) {
    hideLoader();
    alert("Error loading PDF: " + err.message);
    console.error(err);
  }
}

// ------------------ CONTROLS ------------------
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

// ------------------ SWIPE SUPPORT ------------------
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

// ------------------ HELPERS ------------------
function showLoader(text) {
  loader.classList.remove("hidden");
  loaderText.textContent = text || "Loading...";
}
function hideLoader() {
  loader.classList.add("hidden");
}

// ------------------ RESPONSIVE ------------------
window.addEventListener("resize", () => {
  if (pageFlip) {
    pageFlip.update({
      width: Math.min(window.innerWidth * 0.9, 800),
      height: Math.min(window.innerHeight * 0.8, 1000),
    });
    if (window.innerWidth > 900) pageFlip.update({ mode: "book" });
    else pageFlip.update({ mode: "portrait" });
  }
});
