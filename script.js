// ✅ Fix for PDF.js worker warning
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
  measurementId: "G-2T9KF0DXL5"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// 🔹 Elements
const pageInfo = document.getElementById("pageInfo");
const flipSound = document.getElementById("flipSound");
const flipbook = document.getElementById("flipbook");
const loader = document.getElementById("loader");
const loaderText = document.getElementById("loaderText");
const welcomeUser = document.getElementById("welcomeUser");
const logoutBtn = document.getElementById("logoutBtn");
const loginOverlay = document.getElementById("loginOverlay");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const authMessage = document.getElementById("authMessage");

// 🔹 PDF/Flipbook Vars
let pdfDoc = null,
    totalPages = 0,
    scale = 1.2,
    soundOn = true,
    pageFlip = null,
    maxPagesAllowed = 10; // default free limit

// ✅ Auth Handlers
loginBtn.addEventListener("click", () => {
  auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
    .catch(err => authMessage.textContent = err.message);
});
signupBtn.addEventListener("click", () => {
  auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
    .catch(err => authMessage.textContent = err.message);
});
logoutBtn.addEventListener("click", () => {
  auth.signOut().then(() => location.reload());
});

// ✅ Auth State
auth.onAuthStateChanged(user => {
  if (user) {
    loginOverlay.style.display = "none";
    let username = user.email.split("@")[0];
    welcomeUser.textContent = `Welcome, ${username}`;
    logoutBtn.style.display = "inline-block";

    // ✅ Check paid/free from users.json
    fetch("users.json")
      .then(res => res.json())
      .then(users => {
        let userData;

        if (Array.isArray(users)) {
          // Case 1: users.json is an array
          userData = users.find(u => u.email === user.email);
        } else {
          // Case 2: users.json is an object
          userData = users[user.email];
        }

        if (userData && userData.paid) {
          maxPagesAllowed = Infinity; // unlock all pages
        } else {
          maxPagesAllowed = 10; // only first 10
        }

        loadPDF();
      })
      .catch(err => {
        console.error("Error loading users.json:", err);
        loadPDF(); // fallback
      });

  } else {
    loginOverlay.style.display = "flex";
    welcomeUser.textContent = "";
    logoutBtn.style.display = "none";
  }
});

// ✅ Load PDF
function loadPDF() {
  pdfjsLib.getDocument("yourcourse.pdf").promise.then(pdf => {
    pdfDoc = pdf;
    totalPages = pdf.numPages;
    renderPages();
  });
}

// ✅ Render all pages
async function renderPages() {
  const pages = [];
  const limit = Math.min(totalPages, maxPagesAllowed);

  for (let i = 1; i <= limit; i++) {
    const wrapper = document.createElement("div");
    wrapper.className = "page";

    const canvas = document.createElement("canvas");
    canvas.className = "pdf-page";
    wrapper.appendChild(canvas);

    await renderPage(i, canvas);
    pages.push(wrapper);

    loaderText.textContent = `Loading page ${i} of ${limit}...`;
  }

  // ❌ Show purchase message if free user
 /* if (limit < totalPages) {
    const messageDiv = document.createElement("div");
    messageDiv.className = "page";
    messageDiv.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;background:#222;color:#fff;font-size:20px;text-align:center;padding:20px;">
        You have reached the free limit (10 pages).<br>
        <strong>Purchase to unlock full book.</strong>
      </div>`;
    pages.push(messageDiv);
  }*/

if (limit < totalPages) {
  const lockWrapper = document.createElement("div");
  lockWrapper.className = "page";
  lockWrapper.innerHTML = `
<div class="locked-screen">
  <img src="children-future.png" alt="Children towards future" class="future-img">

  <div class="overlay-content">
   
    <p>"Knowledge is the bridge to your dreams"</p>
    <p>"Unlock the full book and take first step towards success."</p>
  </div>

  <div class="button-group bottom-buttons">
    <a href="https://naikskillacademy.odoo.com/enrollment" class="btn enroll">✨ Enroll Now</a>
    <a href="https://wa.me/918895478287?text=HI!!%20I%20want%20to%20Enroll" class="btn contact">💬 Contact Us</a>
  </div>
</div>

  `;
  pages.push(lockWrapper);
}

  flipbook.innerHTML = "";
  if (pageFlip) pageFlip.destroy();

  pageFlip = new St.PageFlip(flipbook, {
    width: 500,
    height: 700,
    size: "stretch",
    minWidth: 315,
    maxWidth: 1200,
    minHeight: 400,
    maxHeight: 1600,
    maxShadowOpacity: 0.5,
    showCover: true,
    useMouseEvents: true,
    mobileScrollSupport: true,
  });

  pageFlip.loadFromHTML(pages);
  updatePageInfo(1);

  pageFlip.on("flip", (e) => {
    updatePageInfo(e.data + 1);
    if (soundOn) flipSound.play();
  });

  loader.classList.add("fade-out");
  setTimeout(() => loader.style.display = "none", 800);
}

function renderPage(num, canvas) {
  return pdfDoc.getPage(num).then(page => {
    const viewport = page.getViewport({ scale: scale });
    const ctx = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    return page.render({ canvasContext: ctx, viewport: viewport }).promise;
  });
}

// ✅ Page Info
function updatePageInfo(pageNum) {
  const limit = Math.min(totalPages, maxPagesAllowed);
  pageInfo.textContent = `${pageNum} / ${limit}`;
}

// ✅ Navigation
document.getElementById("prevPage").addEventListener("click", () => {
  if (pageFlip) pageFlip.flipPrev();
});
document.getElementById("nextPage").addEventListener("click", () => {
  if (pageFlip) pageFlip.flipNext();
});

// ✅ Fullscreen
document.getElementById("fullscreen").addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});

// ✅ Sound toggle
document.getElementById("soundToggle").addEventListener("click", () => {
  soundOn = !soundOn;
  document.getElementById("soundToggle").textContent = soundOn ? "🔊" : "🔇";
});

// ✅ Keyboard Support
document.addEventListener("keydown", (e) => {
  if (!pageFlip) return;
  if (e.key === "ArrowLeft") pageFlip.flipPrev();
  if (e.key === "ArrowRight") pageFlip.flipNext();
});
