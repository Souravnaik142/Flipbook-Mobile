// Worker setup
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

// Detect correct view mode
function getViewMode() {
  const w = window.innerWidth;
  if (w <= 768) return "single";   // Phones
  if (w <= 1200) return "double";  // Tablets
  return "double";                 // Desktops
}

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

async function initializeFlipbook() {
  showLoader("Preparing book...");
  try {
    const loadingTask = pdfjsLib.getDocument("yourcourse.pdf");
    pdfDoc = await loadingTask.promise;
    pageCount = pdfDoc.numPages;

    flipbookEl.innerHTML = "";
    const pages = [];

    for (let i = 1; i <= pageCount; i++) {
      loaderText.textContent = `Rendering page ${i} of ${pageCount}...`;
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;

      const pageDiv = document.createElement("div");
      pageDiv.className = "page";
      const img = document.createElement("img");
      img.src = canvas.toDataURL("image/jpeg", 0.9);
      img.alt = `Page ${i}`;
      pageDiv.appendChild(img);
      flipbookEl.appendChild(pageDiv);
      pages.push(pageDiv);
    }

    const viewMode = getViewMode();

    pageFlip = new St.PageFlip(flipbookEl, {
      width: 600,
      height: 800,
      size: "stretch",
      showCover: true,
      usePortrait: true,
      viewMode,
      maxShadowOpacity: 0.4,
    });

    pageFlip.loadFromHTML(pages);
    hideLoader();
    pageInfo.textContent = `1 / ${pageCount}`;

    pageFlip.on("flip", (e) => {
      pageInfo.textContent = `${e.data + 1} / ${pageCount}`;
      if (soundOn) flipSound.play().catch(() => {});
    });

    bindControls();

    window.addEventListener("resize", () => {
      const newMode = getViewMode();
      pageFlip.update({ viewMode: newMode });
    });

  } catch (err) {
    hideLoader();
    console.error(err);
    alert("Error loading PDF: " + err.message);
  }
}

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

function showLoader(text) {
  loader.classList.remove("hidden");
  loaderText.textContent = text || "Loading...";
}
function hideLoader() {
  loader.classList.add("hidden");
}
