// ============================================================
// ระบบติดตามแฟ้มเอกสาร — app logic (Firebase Firestore backend)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

// ============ Login Gate (Firebase Authentication) ============
// username ของเจ้าหน้าที่จะถูกแปลงเป็นอีเมลหลอกสำหรับ Firebase Auth (Email/Password)
// ต้องสร้างผู้ใช้นี้ไว้ใน Firebase Console > Authentication > Users ก่อนใช้งานจริง
const STAFF_EMAIL_DOMAIN = 'staff.kongchangfile.app';
function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@${STAFF_EMAIL_DOMAIN}`;
}

const loginPage = document.getElementById('login-page');
const appRoot = document.getElementById('appRoot');
const loginForm = document.getElementById('loginForm');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');
const loginErrorText = document.getElementById('loginErrorText');
const loginTogglePw = document.getElementById('loginTogglePw');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const loginSubmitText = document.getElementById('loginSubmitText');
const logoutBtn = document.getElementById('logoutBtn');

function showApp() {
  loginPage.classList.remove('active');
  appRoot.classList.add('show');
}

function showLoginScreen() {
  appRoot.classList.remove('show');
  loginPage.classList.add('active');
  setTimeout(() => loginUsername.focus(), 50);
}

function showLoginError(msg) {
  loginErrorText.textContent = msg;
  loginError.classList.remove('show');
  void loginError.offsetWidth; // reset animation
  loginError.classList.add('show');
}

function setLoginLoading(isLoading) {
  loginSubmitBtn.disabled = isLoading;
  loginSubmitBtn.classList.toggle('loading', isLoading);
  loginSubmitText.textContent = isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ';
}

loginTogglePw.addEventListener('click', () => {
  const isPw = loginPassword.type === 'password';
  loginPassword.type = isPw ? 'text' : 'password';
});

// การส่งฟอร์มและปุ่มออกจากระบบถูกผูกไว้ในส่วน Firebase setup ด้านล่าง
// (ต้องรอให้ auth พร้อมใช้งานก่อน)

const CHECK_SVG = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const EDIT_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.474 5.408a2.5 2.5 0 0 1 3.536 3.536L7.5 21.454 3 22l.546-4.5L16.474 5.408Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const TRASH_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7H20" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M9 7V5C9 4.44772 9.44772 4 10 4H14C14.5523 4 15 4.44772 15 5V7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 7L6.75 19.25C6.80228 20.1074 7.51555 20.75 8.375 20.75H15.625C16.4845 20.75 17.1977 20.1074 17.25 19.25L18 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11V16.5M14 11V16.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const TRASH_SVG_LARGE = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7H20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M9 7V5C9 4.44772 9.44772 4 10 4H14C14.5523 4 15 4.44772 15 5V7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 7L6.75 19.25C6.80228 20.1074 7.51555 20.75 8.375 20.75H15.625C16.4845 20.75 17.1977 20.1074 17.25 19.25L18 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11V16.5M14 11V16.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
const DOC_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.5 3.5H13L18 8.5V19.5C18 20.0523 17.5523 20.5 17 20.5H6.5C5.94772 20.5 5.5 20.0523 5.5 19.5V4.5C5.5 3.94772 5.94772 3.5 6.5 3.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M13 3.5V7.5C13 8.05228 13.4477 8.5 14 8.5H18" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const CLOCK_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:-2px; margin-right:3px;"><circle cx="12" cy="13" r="8" stroke="currentColor" stroke-width="1.8"/><path d="M12 9V13L15 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.5 2.5H14.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

// ---------- Elements ----------
const navBtns = document.querySelectorAll('.nav-btn:not(.logout-btn)');
const pages = document.querySelectorAll('.page');

const addFileHeader = document.getElementById('addFileHeader');
const form = document.getElementById('addFileForm');
const titleInput = document.getElementById('titleInput');
const descInput = document.getElementById('descInput');
const photoInput = document.getElementById('photoInput');
const photoUploadBox = document.getElementById('photoUploadBox');
const photoPreview = document.getElementById('photoPreview');
const previewImg = document.getElementById('previewImg');
const previewName = document.getElementById('previewName');
const removePhotoBtn = document.getElementById('removePhotoBtn');
const submitBtn = document.getElementById('submitBtn');

const fileList = document.getElementById('fileList');
const emptyState = document.getElementById('emptyState');
const emptyTitle = document.getElementById('emptyTitle');
const emptyText = document.getElementById('emptyText');

const statTotal = document.getElementById('statTotal');
const statPending = document.getElementById('statPending');
const statDone = document.getElementById('statDone');
const countAll = document.getElementById('countAll');
const countPending = document.getElementById('countPending');
const countDone = document.getElementById('countDone');

const filterTabs = document.querySelectorAll('.filter-tab');
const timeframeChips = document.querySelectorAll('.timeframe-chip');
const timeframeCustomRange = document.getElementById('timeframeCustomRange');
const timeframeDate = document.getElementById('timeframeDate');
const searchInput = document.getElementById('searchInput');
const searchClearBtn = document.getElementById('searchClearBtn');
const pagination = document.getElementById('pagination');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxClose = document.getElementById('lightboxClose');
const connStatus = document.getElementById('connStatus');
const detailModalBackdrop = document.getElementById('detailModalBackdrop');
const detailModalBody = document.getElementById('detailModalBody');
const detailModalClose = document.getElementById('detailModalClose');
const detailEditBtn = document.getElementById('detailEditBtn');
const detailDeleteBtn = document.getElementById('detailDeleteBtn');

// ---------- State ----------
let state = { entries: [] };
let seqMap = new Map(); // id -> running number, computed each render from createdAt order
let currentFilter = 'all';
let currentTimeframe = 'all'; // 'all' | 'today' | 'week' | 'month' | 'year' | 'custom'
let customDate = ''; // ISO date string (yyyy-mm-dd) เลือกจาก "เลือกวันที่"
let searchQuery = '';
let currentPage = 1;
const PAGE_SIZE = 6;
let pendingPhoto = null;
let pendingPhotoFile = null;
let editingDateFor = null; // { id, type } เช่น { id: 'e123', type: 'sent' }
let editingEntryId = null; // id ของแฟ้มที่กำลังแก้ไข, null = โหมดเพิ่มแฟ้มใหม่

// ============ Connection status banner ============
function showConnMessage(msg, isError) {
  connStatus.textContent = msg;
  connStatus.hidden = false;
  connStatus.classList.toggle('error', !!isError);
}
function hideConnMessage() {
  connStatus.hidden = true;
}

// ============ Firebase setup (Auth + Firestore) ============
let auth = null;
let db = null;
let entriesCol = null;
let unsubscribeEntries = null;

function startEntriesSync() {
  if (!entriesCol || unsubscribeEntries) return;
  const entriesQuery = query(entriesCol, orderBy('createdAt', 'desc'));
  unsubscribeEntries = onSnapshot(entriesQuery, (snapshot) => {
    try {
      state.entries = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      hideConnMessage();
      render();
    } catch (err) {
      // กันหน้าจอขาวทั้งหน้า: ถ้า render พังจากข้อมูลผิดปกติ ให้แจ้งเตือนแทนที่จะปล่อยให้แครช
      console.error('Render error (ข้อมูลแฟ้มอาจผิดรูปแบบ):', err);
      showConnMessage('⚠️ แสดงผลข้อมูลไม่สำเร็จ — ข้อมูลบางรายการอาจผิดรูปแบบ (ดู Console สำหรับรายละเอียด)', true);
    }
  }, (err) => {
    console.error('Firestore sync error:', err);
    showConnMessage('⚠️ เชื่อมต่อ Firestore ไม่สำเร็จ — ตรวจสอบ Firestore Rules และการตั้งค่าโปรเจกต์', true);
  });
}

function stopEntriesSync() {
  if (unsubscribeEntries) {
    unsubscribeEntries();
    unsubscribeEntries = null;
  }
  state.entries = [];
}

if (firebaseConfig.apiKey === 'YOUR_API_KEY') {
  showConnMessage('⚠️ ยังไม่ได้ตั้งค่า Firebase — แก้ไขไฟล์ firebase-config.js ด้วยค่าโปรเจกต์ของคุณ แล้วรีเฟรชหน้านี้', true);
  showLoginScreen();
} else {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    entriesCol = collection(db, 'entries');

    onAuthStateChanged(auth, (user) => {
      if (user) {
        showApp();
        startEntriesSync();
      } else {
        stopEntriesSync();
        showLoginScreen();
      }
    });

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const enteredUser = loginUsername.value.trim();
      const enteredPass = loginPassword.value;
      if (!enteredUser || !enteredPass) return;

      setLoginLoading(true);
      try {
        await signInWithEmailAndPassword(auth, usernameToEmail(enteredUser), enteredPass);
        loginError.classList.remove('show');
        loginForm.reset();
        // onAuthStateChanged จะจัดการเปิดหน้าแอปให้เอง
      } catch (err) {
        console.error('Login failed:', err);
        const code = err && err.code;
        let msg = 'เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง';
        if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-email') {
          msg = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        } else if (code === 'auth/too-many-requests') {
          msg = 'ลองผิดหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่';
        } else if (code === 'auth/network-request-failed') {
          msg = 'เชื่อมต่อเครือข่ายไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่';
        }
        showLoginError(msg);
        loginPassword.value = '';
        loginPassword.focus();
      } finally {
        setLoginLoading(false);
      }
    });

    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Logout failed:', err);
      }
    });
  } catch (err) {
    console.error('Firebase init error:', err);
    showConnMessage('⚠️ ตั้งค่า Firebase ไม่ถูกต้อง — ตรวจสอบไฟล์ firebase-config.js', true);
    showLoginScreen();
  }
}

// ============ Firestore write helpers ============
async function addEntry(entryData) {
  if (!entriesCol) {
    showConnMessage('⚠️ ยังเชื่อมต่อ Firebase ไม่ได้ ตรวจสอบ firebase-config.js', true);
    return false;
  }
  try {
    await addDoc(entriesCol, entryData);
    return true;
  } catch (err) {
    console.error('Add failed:', err);
    showConnMessage('⚠️ บันทึกแฟ้มไม่สำเร็จ ลองใหม่อีกครั้ง', true);
    return false;
  }
}

async function updateEntry(id, patch) {
  if (!db) {
    showConnMessage('⚠️ ยังเชื่อมต่อ Firebase ไม่ได้ ตรวจสอบ firebase-config.js', true);
    return false;
  }
  try {
    await updateDoc(doc(db, 'entries', id), patch);
    return true;
  } catch (err) {
    console.error('Update failed:', err);
    showConnMessage('⚠️ อัปเดตข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง', true);
    return false;
  }
}

async function removeEntry(id) {
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'entries', id));
  } catch (err) {
    console.error('Delete failed:', err);
    showConnMessage('⚠️ ลบแฟ้มไม่สำเร็จ ลองใหม่อีกครั้ง', true);
  }
}

// ============ Navigation ============
navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const pageId = btn.dataset.page + '-page';
    if (pageId === 'add-file-page') {
      // เข้าหน้านี้ผ่านเมนูโดยตรง = เริ่มเพิ่มแฟ้มใหม่ ไม่ใช่แก้ไขแฟ้มเดิม
      resetFormToAddMode();
    } else {
      editingEntryId = null;
    }
    switchPage(pageId);
    navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

function switchPage(pageId) {
  const target = document.getElementById(pageId);
  if (!target) {
    console.error('switchPage: ไม่พบหน้า', pageId);
    return; // กันไม่ให้ active ของทุกหน้าโดนลบทิ้งแล้วไม่มีหน้าไหนแสดงเลย (หน้าจอขาว)
  }
  pages.forEach(p => p.classList.remove('active'));
  target.classList.add('active');
}

// ============ Add / Edit form mode helpers ============
function resetFormToAddMode() {
  editingEntryId = null;
  titleInput.value = '';
  descInput.value = '';
  pendingPhoto = null;
  pendingPhotoFile = null;
  photoInput.value = '';
  photoPreview.classList.remove('show');
  addFileHeader.textContent = 'เพิ่มแฟ้มใหม่';
  submitBtn.textContent = 'บันทึกแฟ้มใหม่';
}

function openEditForm(id) {
  const entry = state.entries.find(x => x.id === id);
  if (!entry) return;

  editingEntryId = id;
  titleInput.value = entry.title || '';
  descInput.value = entry.desc || '';

  if (entry.photo) {
    pendingPhoto = entry.photo;
    pendingPhotoFile = null;
    displayPhotoPreview();
  } else {
    pendingPhoto = null;
    pendingPhotoFile = null;
    photoInput.value = '';
    photoPreview.classList.remove('show');
  }

  addFileHeader.textContent = 'แก้ไขแฟ้ม';
  submitBtn.textContent = 'บันทึกการแก้ไข';

  switchPage('add-file-page');
  navBtns.forEach(b => b.classList.remove('active'));
  navBtns[1].classList.add('active');
}

// ============ Photo Upload ============
photoUploadBox.addEventListener('click', () => photoInput.click());

photoUploadBox.addEventListener('dragover', (e) => {
  e.preventDefault();
  photoUploadBox.style.background = '#f0f2f7';
});

photoUploadBox.addEventListener('dragleave', () => {
  photoUploadBox.style.background = '';
});

photoUploadBox.addEventListener('drop', (e) => {
  e.preventDefault();
  photoUploadBox.style.background = '';
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    photoInput.files = files;
    handlePhotoSelect();
  }
});

photoInput.addEventListener('change', handlePhotoSelect);

function handlePhotoSelect() {
  const file = photoInput.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    alert('ไฟล์ใหญ่เกินไป (สูงสุด 5MB)');
    photoInput.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxW = 600;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      pendingPhoto = canvas.toDataURL('image/jpeg', 0.75);
      pendingPhotoFile = file;
      displayPhotoPreview();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function displayPhotoPreview() {
  previewImg.src = pendingPhoto;
  previewName.textContent = pendingPhotoFile ? pendingPhotoFile.name : 'รูปที่แนบไว้เดิม';
  photoPreview.classList.add('show');
}

removePhotoBtn.addEventListener('click', (e) => {
  e.preventDefault();
  pendingPhoto = null;
  pendingPhotoFile = null;
  photoInput.value = '';
  photoPreview.classList.remove('show');
});

// ============ Form Submit (เพิ่มแฟ้มใหม่ / แก้ไขแฟ้ม) ============
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;

  const isEditing = !!editingEntryId;

  submitBtn.disabled = true;
  submitBtn.textContent = 'กำลังบันทึก...';

  let ok;
  if (isEditing) {
    ok = await updateEntry(editingEntryId, {
      title: title,
      desc: descInput.value.trim(),
      photo: pendingPhoto
    });
  } else {
    ok = await addEntry({
      title: title,
      desc: descInput.value.trim(),
      photo: pendingPhoto,
      sent: false,
      sentDate: null,
      returned: false,
      returnedDate: null,
      createdAt: Date.now()
    });
  }

  submitBtn.disabled = false;

  if (!ok) {
    submitBtn.textContent = isEditing ? 'บันทึกการแก้ไข' : 'บันทึกแฟ้มใหม่';
    return;
  }

  currentPage = 1;
  resetFormToAddMode();

  // Switch to dashboard
  switchPage('dashboard-page');
  navBtns.forEach(b => b.classList.remove('active'));
  navBtns[0].classList.add('active');
});

// ============ Status Toggle ============
function toggleStatusWithDatePicker(id, type) {
  const entry = state.entries.find(x => x.id === id);
  if (!entry) return;

  const isPending = editingDateFor && editingDateFor.id === id && editingDateFor.type === type;

  // ถ้า already checked แล้ว (บันทึกแล้วจริง) ให้ uncheck
  if (type === 'sent' && entry.sent) {
    updateEntry(id, { sent: false, sentDate: null, returned: false, returnedDate: null });
    editingDateFor = null;
    render();
    return;
  } else if (type === 'returned' && entry.returned) {
    updateEntry(id, { returned: false, returnedDate: null });
    editingDateFor = null;
    render();
    return;
  }

  // ถ้าติ๊กค้างรอกรอกวันที่อยู่ (ยังไม่กดบันทึก) แล้วกดซ้ำ ให้ยกเลิกการติ๊ก
  if (isPending) {
    editingDateFor = null;
    render();
    return;
  }

  // ยังไม่ติ๊ก -> เปิดช่องกรอกวันที่ ยังไม่ถือว่าสำเร็จจนกว่าจะเลือกวันที่แล้วกด "บันทึก"
  if (type === 'returned' && !entry.sent) return; // ต้องส่งขึ้นไปก่อนถึงจะรับลงมาได้

  editingDateFor = { id, type };
  render();

  setTimeout(() => {
    const datePicker = fileList.querySelector(`[data-entry-id="${id}"][data-type="${type}"] .date-input`);
    if (datePicker) {
      datePicker.focus();
      if (datePicker.showPicker) {
        try { datePicker.showPicker(); } catch (e) {}
      }
    }
  }, 0);
}

function saveDateForEntry(id, type) {
  const entry = state.entries.find(x => x.id === id);
  if (!entry) return;

  const picker = fileList.querySelector(`[data-entry-id="${id}"][data-type="${type}"]`);
  const input = picker ? picker.querySelector('.date-input') : null;
  if (!input || !input.value) return;

  const patch = type === 'sent'
    ? { sent: true, sentDate: input.value }
    : { returned: true, returnedDate: input.value };

  updateEntry(id, patch);
  editingDateFor = null;
  render();
}

function cancelDateEdit() {
  editingDateFor = null;
  render();
}

function deleteEntry(id) {
  // Show custom confirm dialog with animation
  showDeleteConfirmDialog(id);
}

function showDeleteConfirmDialog(id) {
  // Create custom confirm dialog
  const backdrop = document.createElement('div');
  backdrop.className = 'delete-confirm-backdrop';
  backdrop.innerHTML = `
    <div class="delete-confirm-dialog">
      <div class="delete-confirm-icon">${TRASH_SVG_LARGE}</div>
      <h3 class="delete-confirm-title">ลบแฟ้มนี้?</h3>
      <p class="delete-confirm-text">การกระทำนี้ไม่สามารถยกเลิกได้</p>
      <div class="delete-confirm-actions">
        <button class="delete-confirm-cancel">ยกเลิก</button>
        <button class="delete-confirm-ok">ลบแฟ้ม</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(backdrop);
  
  // Trigger animation
  requestAnimationFrame(() => {
    backdrop.classList.add('show');
  });
  
  const cancelBtn = backdrop.querySelector('.delete-confirm-cancel');
  const okBtn = backdrop.querySelector('.delete-confirm-ok');
  
  function closeDialog() {
    backdrop.classList.remove('show');
    setTimeout(() => {
      backdrop.remove();
    }, 300);
  }
  
  cancelBtn.addEventListener('click', closeDialog);
  
  okBtn.addEventListener('click', async () => {
    // Add deleting animation to the card
    const card = document.querySelector(`[data-action="delete"][data-id="${id}"]`).closest('.file-card');
    card.classList.add('deleting');
    
    // Close dialog
    closeDialog();
    
    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Delete the entry
    removeEntry(id);
  });
  
  // Close on backdrop click
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeDialog();
  });
  
  // Close on escape key
  document.addEventListener('keydown', function handleEscape(e) {
    if (e.key === 'Escape') {
      closeDialog();
      document.removeEventListener('keydown', handleEscape);
    }
  });
}

// ============ Rendering ============
function rebuildSeqMap() {
  seqMap = new Map();
  const asc = [...state.entries].sort((a, b) => a.createdAt - b.createdAt);
  asc.forEach((e, idx) => seqMap.set(e.id, idx + 1));
}

function render() {
  rebuildSeqMap();

  const total = state.entries.length;
  const pending = state.entries.filter(e => e.sent && !e.returned).length;
  const done = state.entries.filter(e => e.sent && e.returned).length;

  statTotal.textContent = total;
  statPending.textContent = pending;
  statDone.textContent = done;
  countAll.textContent = total;
  countPending.textContent = pending;
  countDone.textContent = done;

  filterTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === currentFilter);
  });

  timeframeChips.forEach(chip => {
    chip.classList.toggle('active', chip.dataset.timeframe === currentTimeframe);
  });

  const filtered = applyFilter(state.entries);

  if (filtered.length === 0) {
    fileList.innerHTML = '';
    pagination.innerHTML = '';
    emptyState.classList.remove('hidden');
    if (total === 0) {
      emptyTitle.textContent = 'ยังไม่มีแฟ้มในระบบ';
      emptyText.textContent = 'กดปุ่ม "เพิ่มแฟ้มใหม่" เพื่อเริ่มติดตามแฟ้มเอกสารของคุณ';
    } else if (searchQuery) {
      emptyTitle.textContent = 'ไม่พบแฟ้มที่ค้นหา';
      emptyText.textContent = 'ลองค้นหาด้วยคำอื่น หรือล้างคำค้นหา';
    } else {
      emptyTitle.textContent = 'ไม่มีแฟ้มในหมวดนี้';
      emptyText.textContent = 'ลองเลือกแท็บอื่นเพื่อดูแฟ้มทั้งหมด';
    }
    return;
  }

  emptyState.classList.add('hidden');

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  fileList.innerHTML = pageItems.map(entry => createFileCard(entry)).join('');

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  let html = `<button class="page-btn" data-page="prev" ${currentPage === 1 ? 'disabled' : ''} aria-label="ก่อนหน้า">‹</button>`;

  getPageNumbers(currentPage, totalPages).forEach(p => {
    if (p === '...') {
      html += `<span class="page-ellipsis">…</span>`;
    } else {
      html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }
  });

  html += `<button class="page-btn" data-page="next" ${currentPage === totalPages ? 'disabled' : ''} aria-label="ถัดไป">›</button>`;

  pagination.innerHTML = html;
}

function getPageNumbers(current, total) {
  const delta = 1;
  const range = [];
  const withDots = [];
  let last;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }

  range.forEach(i => {
    if (last !== undefined) {
      if (i - last === 2) withDots.push(last + 1);
      else if (i - last !== 1) withDots.push('...');
    }
    withDots.push(i);
    last = i;
  });

  return withDots;
}

function applyFilter(entries) {
  let result = entries;
  if (currentFilter === 'pending') result = result.filter(e => e.sent && !e.returned);
  else if (currentFilter === 'done') result = result.filter(e => e.sent && e.returned);

  const range = getTimeframeRange();
  if (range) {
    result = result.filter(e => e.createdAt >= range.start.getTime() && e.createdAt < range.end.getTime());
  }

  if (searchQuery) {
    result = result.filter(e => entrySearchText(e).includes(searchQuery));
  }

  // Sort by status: not started → pending → done, then by createdAt descending
  result.sort((a, b) => {
    const statusA = getEntryStatus(a);
    const statusB = getEntryStatus(b);
    const statusOrder = { 'not-started': 0, 'pending': 1, 'done': 2 };
    
    if (statusOrder[statusA] !== statusOrder[statusB]) {
      return statusOrder[statusA] - statusOrder[statusB];
    }
    // If same status, sort by createdAt descending (newest first)
    return b.createdAt - a.createdAt;
  });

  return result;
}

function getEntryStatus(entry) {
  if (entry.sent && entry.returned) return 'done';
  if (entry.sent && !entry.returned) return 'pending';
  return 'not-started';
}

// คำนวณช่วงวันที่ (start inclusive, end exclusive) ตาม currentTimeframe ที่เลือกไว้
// คืนค่า null เมื่อไม่ได้กรองตามช่วงเวลา (เลือก "ทั้งหมด" หรือยังไม่ได้กำหนดช่วงเองครบ)
function getTimeframeRange() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (currentTimeframe === 'today') {
    const start = startOfToday;
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  if (currentTimeframe === 'week') {
    const dayOfWeek = startOfToday.getDay(); // 0 = อาทิตย์
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const start = new Date(startOfToday);
    start.setDate(start.getDate() - diffToMonday);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }

  if (currentTimeframe === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, end };
  }

  if (currentTimeframe === 'year') {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear() + 1, 0, 1);
    return { start, end };
  }

  if (currentTimeframe === 'custom' && customDate) {
    const start = isoToDateObj(customDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  return null;
}

// รวมข้อความสำหรับค้นหา: ชื่อเรื่อง, รายละเอียด, และวันที่ (สร้าง/ส่งขึ้น/รับลงมา)
// ในหลายรูปแบบ (ไทยเต็ม, ไทยย่อ, ตัวเลข วัน/เดือน/ปี) เพื่อให้ค้นด้วยวัน เดือน หรือปีได้
function entrySearchText(entry) {
  const parts = [entry.title, entry.desc || ''];

  parts.push(dateSearchTokens(new Date(entry.createdAt)));
  if (entry.sentDate) parts.push(dateSearchTokens(isoToDateObj(entry.sentDate)));
  if (entry.returnedDate) parts.push(dateSearchTokens(isoToDateObj(entry.returnedDate)));

  return parts.join(' ').toLowerCase();
}

function isoToDateObj(isoStr) {
  const [year, month, day] = isoStr.split('-');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

function dateSearchTokens(d) {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const buddhistYear = year + 543;
  const thaiLong = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  const thaiShort = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });

  return [
    thaiLong, thaiShort,
    `${day}/${month}/${year}`,
    `${day}-${month}-${year}`,
    `${year}-${month}-${day}`,
    String(year), String(buddhistYear)
  ].join(' ');
}

function createFileCard(entry) {
  const photoHtml = entry.photo
    ? `<img class="file-photo" src="${entry.photo}" alt="รูป: ${escapeHtml(entry.title)}" data-full="${entry.photo}" />`
    : `<div class="file-photo placeholder">${DOC_SVG}</div>`;

  const todayStr = new Date().toISOString().split('T')[0];

  const showSentDatePicker = editingDateFor && editingDateFor.id === entry.id && editingDateFor.type === 'sent';
  const showReturnedDatePicker = editingDateFor && editingDateFor.id === entry.id && editingDateFor.type === 'returned';

  // ติ๊กถูกให้ขึ้นทันทีตอนเปิดช่องกรอกวันที่ (ก่อนกดบันทึกจริง) เพื่อให้เห็นว่าเลือกแล้ว
  const sentCheckSvg = (entry.sent || showSentDatePicker) ? CHECK_SVG : '';
  const returnedCheckSvg = (entry.returned || showReturnedDatePicker) ? CHECK_SVG : '';

  const sentDateValue = entry.sent && entry.sentDate ? entry.sentDate : todayStr;
  const returnedDateValue = entry.returned && entry.returnedDate ? entry.returnedDate : todayStr;

  const sentDateDisplay = entry.sent && entry.sentDate ? isoToThaiDate(entry.sentDate) : '';
  const returnedDateDisplay = entry.returned && entry.returnedDate ? isoToThaiDate(entry.returnedDate) : '';

  return `
    <div class="file-card" data-id="${entry.id}">
      <div style="display: flex; gap: 14px;">
        ${photoHtml}
        <div class="file-header" style="margin: 0; gap: 0;">
          <div class="file-title-section">
            <p class="file-title">${escapeHtml(entry.title)}</p>
            <p class="file-meta">${formatDateTime(entry.createdAt)}</p>
            ${entry.desc ? `<p class="file-meta">${escapeHtml(entry.desc)}</p>` : ''}
          </div>
          <div class="file-code">#${docCode(entry)}</div>
        </div>
      </div>

      <div class="file-status">
        <div style="flex: 1;">
          <button class="status-item" data-action="toggle-sent" data-id="${entry.id}" style="background: none; border: none; padding: 0; cursor: pointer; text-align: left; width: 100%;">
            <div class="status-checkbox ${(entry.sent || showSentDatePicker) ? 'checked' : ''}">${sentCheckSvg}</div>
            <div>
              <div class="status-label">ส่งขึ้นไปแล้ว</div>
              ${sentDateDisplay ? `<div class="status-date">${sentDateDisplay}</div>` : ''}
              ${showSentDatePicker && !entry.sent ? `<div class="status-date">เลือกวันที่แล้วกดบันทึก</div>` : ''}
            </div>
          </button>
          ${(entry.sent || showSentDatePicker) ? `
            <div class="date-picker-inline ${showSentDatePicker ? 'show' : ''}" data-entry-id="${entry.id}" data-type="sent" style="margin-top: 8px;">
              <input type="date" class="date-input" value="${sentDateValue}" max="${todayStr}" />
              <button class="date-save-btn" data-action="save-date" data-id="${entry.id}" data-type="sent">บันทึก</button>
              <button class="date-cancel-btn" data-action="cancel-date" data-id="${entry.id}" data-type="sent">ยกเลิก</button>
            </div>
          ` : ''}
        </div>

        <div class="status-divider"></div>

        <div style="flex: 1;">
          <button class="status-item" data-action="toggle-returned" data-id="${entry.id}" ${!entry.sent ? 'style="opacity: 0.5; pointer-events: none; background: none; border: none; padding: 0; cursor: not-allowed; text-align: left; width: 100%;"' : 'style="background: none; border: none; padding: 0; cursor: pointer; text-align: left; width: 100%;"'}>
            <div class="status-checkbox ${(entry.returned || showReturnedDatePicker) ? 'checked' : ''}">${returnedCheckSvg}</div>
            <div>
              <div class="status-label">รับลงมาแล้ว</div>
              ${returnedDateDisplay ? `<div class="status-date">${returnedDateDisplay}</div>` : ''}
              ${showReturnedDatePicker && !entry.returned ? `<div class="status-date">เลือกวันที่แล้วกดบันทึก</div>` : ''}
            </div>
          </button>
          ${(entry.returned || showReturnedDatePicker) ? `
            <div class="date-picker-inline ${showReturnedDatePicker ? 'show' : ''}" data-entry-id="${entry.id}" data-type="returned" style="margin-top: 8px;">
              <input type="date" class="date-input" value="${returnedDateValue}" max="${todayStr}" />
              <button class="date-save-btn" data-action="save-date" data-id="${entry.id}" data-type="returned">บันทึก</button>
              <button class="date-cancel-btn" data-action="cancel-date" data-id="${entry.id}" data-type="returned">ยกเลิก</button>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="file-footer">
        <div class="file-actions">
          <button class="edit-btn" data-action="edit" data-id="${entry.id}" title="แก้ไข" aria-label="แก้ไข">${EDIT_SVG}</button>
          <button class="delete-btn" data-action="delete" data-id="${entry.id}" title="ลบ" aria-label="ลบ">${TRASH_SVG}</button>
        </div>
      </div>

      ${createTimeframeHtml(entry)}
    </div>
  `;
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function docCode(entry) {
  const seq = seqMap.get(entry.id) || 0;
  return String(seq).padStart(4, '0');
}

function formatDateTime(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) +
         ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

function isoToThaiDate(isoStr) {
  if (!isoStr) return '';
  const [year, month, day] = isoStr.split('-');
  const d = new Date(year, parseInt(month) - 1, day);
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ============ TimeFrame Helper Functions ============
function getDaysDiff(dateStr) {
  if (!dateStr) return null;
  const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
  const today = new Date();
  const diffMs = today - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

function formatTimeframe(days) {
  if (days === null || days === undefined) return '-';
  if (days === 0) return 'วันนี้';
  if (days === 1) return 'เมื่อวาน';
  if (days < 7) return `${days} วัน`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} สัปดาห์`;
  const months = Math.floor(days / 30);
  return `${months} เดือน`;
}

function createTimeframeHtml(entry) {
  const createdDays = getDaysDiff(entry.createdAt);
  const sentDays = entry.sentDate ? getDaysDiff(new Date(entry.sentDate + 'T00:00:00')) : null;
  const returnedDays = entry.returnedDate ? getDaysDiff(new Date(entry.returnedDate + 'T00:00:00')) : null;

  const createdLabel = formatTimeframe(createdDays);
  const sentLabel = sentDays !== null ? formatTimeframe(sentDays) : '-';
  const returnedLabel = returnedDays !== null ? formatTimeframe(returnedDays) : '-';

  const timelineHtml = `
    <div class="timeline">
      <div class="timeline-node completed">
        <div class="timeline-dot">✓</div>
        <div class="timeline-label">สร้าง</div>
        <div class="timeline-time">${createdLabel}</div>
      </div>
      <div class="timeline-node ${entry.sent ? 'completed' : 'pending'}">
        <div class="timeline-dot ${!entry.sent ? 'pending' : ''}">
          ${entry.sent ? '✓' : '◎'}
        </div>
        <div class="timeline-label">ส่งขึ้นไป</div>
        <div class="timeline-time">${sentLabel}</div>
      </div>
      <div class="timeline-node ${entry.returned ? 'completed' : 'pending'}">
        <div class="timeline-dot ${!entry.returned ? 'pending' : ''}">
          ${entry.returned ? '✓' : '◎'}
        </div>
        <div class="timeline-label">รับลงมา</div>
        <div class="timeline-time">${returnedLabel}</div>
      </div>
    </div>
  `;

  const detailHtml = `
    <div class="timeframe-detail">
      <div class="timeframe-item">
        <div class="timeframe-item-label">สร้าง</div>
        <div class="timeframe-item-value">${createdLabel}</div>
      </div>
      <div class="timeframe-item ${entry.sent ? 'active' : 'pending'}">
        <div class="timeframe-item-label">${entry.sent ? 'ส่ง' : 'รอส่ง'}</div>
        <div class="timeframe-item-value">${sentLabel}</div>
      </div>
      <div class="timeframe-item ${entry.returned ? 'active' : 'pending'}">
        <div class="timeframe-item-label">${entry.returned ? 'รับ' : 'รอรับ'}</div>
        <div class="timeframe-item-value">${returnedLabel}</div>
      </div>
    </div>
  `;

  return `
    <div class="file-timeframe">
      <div class="timeframe-label">${CLOCK_SVG} ระยะเวลา</div>
      ${timelineHtml}
      ${detailHtml}
    </div>
  `;
}

// ============ Detail Modal (กดที่แฟ้มเพื่อดู/แก้ไขรายละเอียด) ============
function openDetailModal(id) {
  const entry = state.entries.find(x => x.id === id);
  if (!entry) return;

  let statusText = 'ยังไม่เริ่ม';
  let statusClass = 'not-started';
  if (entry.sent && entry.returned) {
    statusText = 'เสร็จสิ้น';
    statusClass = 'done';
  } else if (entry.sent) {
    statusText = 'รอรับลงมา';
    statusClass = 'pending';
  }

  const photoHtml = entry.photo
    ? `<img class="detail-photo" src="${entry.photo}" alt="รูป: ${escapeHtml(entry.title)}" data-full="${entry.photo}" />`
    : '';

  const infoItems = [
    { label: 'รหัสแฟ้ม', value: `#${docCode(entry)}` },
    { label: 'วันที่สร้าง', value: formatDateTime(entry.createdAt) },
    { label: 'ส่งขึ้นไปแล้ว', value: entry.sent && entry.sentDate ? isoToThaiDate(entry.sentDate) : 'ยังไม่ส่ง' },
    { label: 'รับลงมาแล้ว', value: entry.returned && entry.returnedDate ? isoToThaiDate(entry.returnedDate) : 'ยังไม่รับ' }
  ];

  const infoHtml = infoItems.map(item => `
    <div class="detail-info-item">
      <div class="detail-info-label">${item.label}</div>
      <div class="detail-info-value">${escapeHtml(item.value)}</div>
    </div>
  `).join('');

  const noteHtml = entry.desc ? `
    <div class="detail-note-block">
      <div class="detail-note-label">รายละเอียดเพิ่มเติม</div>
      <div class="detail-note-text">${escapeHtml(entry.desc)}</div>
    </div>
  ` : '';

  detailModalBody.innerHTML = `
    <span class="detail-status-badge ${statusClass}">${statusText}</span>
    <h2 class="detail-modal-title">${escapeHtml(entry.title)}</h2>
    ${photoHtml}
    <div class="detail-info-grid">${infoHtml}</div>
    ${noteHtml}
  `;

  detailEditBtn.dataset.id = id;
  detailDeleteBtn.dataset.id = id;

  detailModalBackdrop.classList.add('open');
}

function closeDetailModal() {
  detailModalBackdrop.classList.remove('open');
}

detailModalClose.addEventListener('click', closeDetailModal);
detailModalBackdrop.addEventListener('click', (e) => {
  if (e.target === detailModalBackdrop) closeDetailModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeDetailModal();
});

detailEditBtn.addEventListener('click', () => {
  const id = detailEditBtn.dataset.id;
  closeDetailModal();
  openEditForm(id);
});
detailDeleteBtn.addEventListener('click', () => {
  const id = detailDeleteBtn.dataset.id;
  closeDetailModal();
  deleteEntry(id);
});

// รูปในหน้าต่างรายละเอียด กดเพื่อดูรูปขยายได้เช่นกัน
detailModalBody.addEventListener('click', (e) => {
  const img = e.target.closest('.detail-photo[data-full]');
  if (img) {
    lightboxImg.src = img.dataset.full;
    lightbox.classList.add('open');
  }
});

// ============ Event Delegation ============
fileList.addEventListener('click', (e) => {
  const img = e.target.closest('.file-photo[data-full]');
  if (img) {
    lightboxImg.src = img.dataset.full;
    lightbox.classList.add('open');
    return;
  }

  const btn = e.target.closest('[data-action]');
  if (btn) {
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    const type = btn.dataset.type;

    if (action === 'toggle-sent') {
      toggleStatusWithDatePicker(id, 'sent');
    } else if (action === 'toggle-returned') {
      toggleStatusWithDatePicker(id, 'returned');
    } else if (action === 'save-date') {
      saveDateForEntry(id, type);
    } else if (action === 'cancel-date') {
      cancelDateEdit();
    } else if (action === 'edit') {
      openEditForm(id);
    } else if (action === 'delete') {
      deleteEntry(id);
    }
    return;
  }

  // คลิกที่ตัวการ์ดเอง (ไม่ใช่ปุ่ม/รูป/ช่องกรอกวันที่) -> เปิดหน้าต่างรายละเอียดของแฟ้มนั้น
  if (e.target.closest('input, .date-picker-inline')) return;
  const card = e.target.closest('.file-card');
  if (card && card.dataset.id) {
    openDetailModal(card.dataset.id);
  }
});

lightboxClose.addEventListener('click', () => lightbox.classList.remove('open'));
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) lightbox.classList.remove('open');
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') lightbox.classList.remove('open');
});

// Filter tabs
filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    currentFilter = tab.dataset.filter;
    currentPage = 1;
    render();
  });
});

// TimeFrame filter
timeframeChips.forEach(chip => {
  chip.addEventListener('click', () => {
    const tf = chip.dataset.timeframe;
    currentTimeframe = tf;
    currentPage = 1;

    if (tf === 'custom') {
      timeframeCustomRange.classList.add('show');
      setTimeout(() => timeframeDate.focus(), 0);
      // ยังไม่กรองจนกว่าจะเลือกวันที่
      if (!customDate) return;
    } else {
      timeframeCustomRange.classList.remove('show');
    }
    render();
  });
});

timeframeDate.addEventListener('change', () => {
  if (!timeframeDate.value) return;
  customDate = timeframeDate.value;
  currentTimeframe = 'custom';
  currentPage = 1;
  render();
});

// Search bar
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim().toLowerCase();
  searchClearBtn.classList.toggle('show', searchQuery.length > 0);
  currentPage = 1;
  render();
});

searchClearBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  searchClearBtn.classList.remove('show');
  currentPage = 1;
  render();
  searchInput.focus();
});

// Pagination
pagination.addEventListener('click', (e) => {
  const btn = e.target.closest('.page-btn');
  if (!btn || btn.disabled) return;
  const p = btn.dataset.page;
  if (p === 'prev') currentPage -= 1;
  else if (p === 'next') currentPage += 1;
  else currentPage = parseInt(p, 10);
  render();
});

// Initial render (data populates once Firestore's onSnapshot fires)
render();
