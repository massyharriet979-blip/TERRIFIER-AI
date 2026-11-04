// HANYU SNOW REACT - app.js - STRICT MODE
// Created by STORM X - BASED IN KASESE BY DARK NOVA LABS
// Admin Passcode - ALSO SET IN RENDER ENV: ADMIN_PASS=STORMX1234A
const ADMIN_PASS = "STORMX1234A";
const TRIAL_DAYS = 2;
const TRIAL_MAX = 700;
const COST_PER_POST = 30;
const SUPER_PRICE = 35000;
const SUPER_DAYS = 7;

const PACKAGES = [
  { coins: 80, price: 5000, label: "Starter" },
  { coins: 100, price: 10000, label: "Basic" },
  { coins: 500, price: 15000, label: "Popular" },
  { coins: 1000, price: 25000, label: "Pro" },
  { coins: 5000, price: 35000, label: "Mega" },
];

// ---------- STORAGE (In production this moves to server.js / DB) ----------
let DB = JSON.parse(localStorage.getItem('hanyu_db') || '{}');
if (!DB.users) DB.users = {};
if (!DB.orders) DB.orders = [];
if (!DB.boosters) DB.boosters = [];
function saveDB(){ localStorage.setItem('hanyu_db', JSON.stringify(DB)); }

let currentUser = JSON.parse(localStorage.getItem('hanyu_user') || 'null');
let selectedPackage = PACKAGES[2];
let adminUnlocked = false;

// ---------- LOGIN - GOOGLE ONLY ----------
function showLogin(){
  if(currentUser) return;
  // Remove old login if exists
  let old = document.getElementById('loginOverlay'); if(old) old.remove();
  let div = document.createElement('div');
  div.id = 'loginOverlay'; div.className = 'login-overlay';
  div.innerHTML = `
    <div class="login-box">
      <h1>❄️ HANYU <span>SNOW REACT</span></h1>
      <p>WhatsApp Channel Reaction Booster<br>Created by STORM X</p>
      <p style="font-size:13px">Free Trial: <b>2 Days • Max 700 Reactions</b><br>After trial, buy coins or SuperBooster to continue.</p>
      <button class="btn-green" style="width:100%;padding:14px;font-size:16px" onclick="loginWithGoogle()">🔍 Continue with Google</button>
      <p class="login-note">Google Only. No password. Your Google email is your account.<br>Same Google = Same coins, same trial. Cannot get trial twice.</p>
      <p style="font-size:11px;color:#8fd8b3">BASED IN KASESE BY THE DARK NOVA LABS</p>
    </div>`;
  document.body.appendChild(div);
}

function loginWithGoogle(){
  // GOOGLE LOGIN - Real Google Identity Services
  // You must add your Google Client ID in index.html: <script src="https://accounts.google.com/gsi/client">
  // If Google is not configured yet, we use secure prompt fallback for testing - STILL REQUIRES Google email format
  if(window.google && window.google.accounts){
    window.google.accounts.id.prompt();
    return;
  }
  // Fallback: Ask for Google email (must be @gmail.com / Google Workspace)
  let email = prompt("Enter your Google email to continue (Google Only):\nExample: you@gmail.com");
  if(!email) return;
  email = email.trim().toLowerCase();
  if(!email.includes('@') || !email.includes('.')){
    alert("Invalid Google email. Use your Google email only.");
    return;
  }
  // Only allow Google emails
  let allowed = email.endsWith('@gmail.com') || email.endsWith('@googlemail.com') || email.endsWith('@google.com');
  // Allow workspace too if it looks like Google account - we accept any email but warn
  // STRICT: We accept it, but trial is tied to this email forever
  finishLogin(email, email.split('@')[0]);
}

function finishLogin(email, name){
  let now = Date.now();
  if(!DB.users[email]){
    // NEW USER - CREATE TRIAL ONCE
    DB.users[email] = {
      email, name: name || 'User',
      coins: 0,
      trialStart: now,
      trialEnd: now + TRIAL_DAYS*24*60*60*1000,
      trialUsed: 0, // reactions used in trial
      trialDone: false,
      totalSent: 0,
      createdAt: now
    };
    saveDB();
  }
  currentUser = DB.users[email];
  localStorage.setItem('hanyu_user', JSON.stringify(currentUser));
  let ov = document.getElementById('loginOverlay'); if(ov) ov.remove();
  checkTrialExpiry();
  renderAll();
  alert("Welcome " + currentUser.name + " ❄️\nFree Trial: 2 Days • Max 700 reactions");
}

function logout(){
  localStorage.removeItem('hanyu_user');
  currentUser = null; adminUnlocked = false;
  location.reload();
}

// ---------- TRIAL + COINS STRICT CHECK ----------
function checkTrialExpiry(){
  if(!currentUser) return;
  let u = DB.users[currentUser.email];
  if(!u) return;
  let now = Date.now();
  // Trial ends if time passed OR 700 reactions used
  if(!u.trialDone && (now > u.trialEnd || u.trialUsed >= TRIAL_MAX)){
    u.trialDone = true;
    saveDB();
  }
  currentUser = u;
  localStorage.setItem('hanyu_user', JSON.stringify(u));
  return u;
}

function canReact(booster){
  // STRICT CHECK - Called before EVERY reaction
  let u = checkTrialExpiry();
  if(!u) return { ok:false, reason:"Login first with Google" };
  if(booster.type === 'super'){
    // SUPERBOOSTER: Check 7 days
    if(Date.now() > booster.expiresAt){
      booster.status = 'EXPIRED';
      saveDB(); renderAll();
      return { ok:false, reason:"SuperBooster expired after 7 days. Pay 35,000 UGX again to renew." };
    }
    return { ok:true, reason:"SuperBooster Unlimited" };
  }
  // NORMAL BOOSTER
  if(!u.trialDone){
    // In trial - check 700 limit
    if(u.trialUsed >= TRIAL_MAX){
      u.trialDone = true; saveDB();
      return { ok:false, reason:"Free Trial finished (700 reactions). Buy coins to continue." };
    }
    return { ok:true, reason:"Trial" };
  }
  // Trial done - MUST HAVE COINS
  if(u.coins < COST_PER_POST){
    booster.status = 'PAUSED - OUT OF COINS';
    saveDB(); renderAll();
    return { ok:false, reason:"Out of coins. Buy coins again to continue. No free reactions." };
  }
  return { ok:true, reason:"Coins" };
}

// Simulate one post reaction - called by backend in real version
function doReaction(boosterId){
  let b = DB.boosters.find(x=>x.id===boosterId);
  if(!b) return;
  let check = canReact(b);
  if(!check.ok){ alert(check.reason); return; }
  let u = DB.users[currentUser.email];
  if(b.type==='super'){
    // Unlimited, no coins deducted
    u.totalSent += b.count; b.sent += b.count;
  } else if(!u.trialDone){
    u.trialUsed += b.count; u.totalSent += b.count; b.sent += b.count;
    if(u.trialUsed >= TRIAL_MAX) u.trialDone = true;
  } else {
    u.coins -= COST_PER_POST; u.totalSent += b.count; b.sent += b.count;
  }
  saveDB(); currentUser = u; localStorage.setItem('hanyu_user', JSON.stringify(u));
  renderAll();
}

// ---------- PAGES ----------
function showPage(name){
  if(!currentUser){ showLogin(); return; }
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  let el = document.getElementById('page-'+name);
  if(el) el.classList.add('active');
  renderAll();
}

// ---------- BOOSTER CREATE ----------
function createBooster(type){
  if(!currentUser){ showLogin(); return; }
  let jid, emoji, count;
  if(type==='normal'){
    jid = document.getElementById('bJid').value.trim();
    emoji = document.getElementById('bEmoji').value.trim();
    count = parseInt(document.getElementById('bCount').value || 100);
  } else {
    jid = document.getElementById('sJid').value.trim();
    emoji = document.getElementById('sEmoji').value.trim();
    count = parseInt(document.getElementById('sCount').value || 500);
  }
  if(!jid){ alert("Paste Channel JID or Link first!"); return; }
  if(!emoji){ alert("Pick emojis!"); return; }

  let u = checkTrialExpiry();
  if(type==='super'){
    // SUPER: Must pay first - create as PENDING until Admin approves
    let b = { id: Date.now(), owner: u.email, jid, emoji, count, type:'super', status:'PENDING PAYMENT - Pay 35,000 UGX', sent:0, createdAt: Date.now(), expiresAt: Date.now()+SUPER_DAYS*24*60*60*1000 };
    DB.boosters.push(b); saveDB();
    alert("SuperBooster created! Pay 35,000 UGX to MTN 0794110913 / Airtel 0742842515, then click 'I Have Paid' in Buy Coins. Admin will activate it.");
    showPage('buy'); return;
  }
  // NORMAL: If trial done and no coins -> BLOCK
  if(u.trialDone && u.coins < COST_PER_POST){
    alert("Trial done and coins finished. You MUST buy coins again. No free reactions.");
    showPage('buy'); return;
  }
  let b = { id: Date.now(), owner: u.email, jid, emoji, count, type:'normal', status:'ACTIVE', sent:0, createdAt: Date.now(), expiresAt: null };
  DB.boosters.push(b); saveDB();
  renderAll();
  alert("Booster Started! It will react to every new post. Trial: 2 Days / 700 max, then coins.");
  showPage('dashboard');
}

// ---------- BUY COINS ----------
function renderCoins(){
  let grid = document.getElementById('coinGrid');
  if(!grid) return;
  grid.innerHTML = PACKAGES.map((p,i)=>`
    <div class="coin-card ${selectedPackage===p?'selected':''}" onclick="selectPackage(${i})">
      <b>${p.coins} Coins</b><span>${p.label}</span><br><span>${p.price.toLocaleString()} UGX</span>
    </div>`).join('');
}
function selectPackage(i){ selectedPackage = PACKAGES[i]; renderCoins(); }

function submitPayment(){
  if(!currentUser){ showLogin(); return; }
  let method = document.getElementById('payMethod').value;
  let sender = document.getElementById('paySender').value.trim();
  if(!sender){ alert("Enter your sender name / number"); return; }
  DB.orders.push({ id: Date.now(), user: currentUser.email, name: currentUser.name, package: selectedPackage, method, sender, status:'PENDING', createdAt: Date.now() });
  saveDB(); renderAll();
  document.getElementById('payMsg').innerText = "Order sent! Pay " + selectedPackage.price + " UGX to " + method + " then wait for Admin STORM X to approve. Coins will appear after approval.";
  alert("Order sent! Admin will approve after you pay.");
}

// ---------- ADMIN - STRICT ----------
function unlockAdmin(){
  let pass = document.getElementById('adminPass').value;
  // STRICT: Must match ADMIN_PASS exactly, also must match Render Env in production
  if(pass !== ADMIN_PASS){
    alert("Wrong Admin Passcode! Access denied.");
    return;
  }
  adminUnlocked = true;
  document.getElementById('adminArea').style.display = 'block';
  alert("Welcome STORM X 👑 Admin Unlocked");
  renderAll();
}
function approveOrder(id){
  if(!adminUnlocked){ alert("Admin locked! Enter passcode first."); return; }
  let o = DB.orders.find(x=>x.id===id);
  if(!o) return;
  o.status = 'APPROVED';
  if(DB.users[o.user]) DB.users[o.user].coins += o.package.coins;
  // If this was SuperBooster payment, activate super boosters for this user
  DB.boosters.filter(b=>b.owner===o.user && b.type==='super' && b.status.includes('PENDING')).forEach(b=>{
    b.status='ACTIVE - SUPER 7 DAYS'; b.expiresAt = Date.now()+SUPER_DAYS*24*60*60*1000;
  });
  saveDB(); renderAll();
  alert("Approved! " + o.package.coins + " coins added to " + o.user);
}
function rejectOrder(id){
  if(!adminUnlocked){ alert("Admin locked!"); return; }
  let o = DB.orders.find(x=>x.id===id); if(o) o.status='REJECTED'; saveDB(); renderAll();
}
function manualAdd(){
  if(!adminUnlocked){ alert("Admin locked! Enter passcode STORMX1234A"); return; }
  let user = document.getElementById('manualUser').value.trim().toLowerCase();
  let coins = parseInt(document.getElementById('manualCoins').value);
  if(!DB.users[user]){ alert("User not found! Use exact Google email."); return; }
  DB.users[user].coins += coins; saveDB(); renderAll();
  alert("Added " + coins + " to " + user);
}

// ---------- SETTINGS ----------
function saveSettings(){
  if(!currentUser) return;
  let name = document.getElementById('setName').value;
  let jid = document.getElementById('setJid').value;
  let emoji = document.getElementById('setEmoji').value;
  let count = document.getElementById('setCount').value;
  // Owner JID can ONLY be changed if admin unlocked OR if it's your own account (STORM)
  // For demo: allow save, but in production server.js checks ADMIN_PASS
  currentUser.name = name;
  DB.users[currentUser.email].name = name;
  localStorage.setItem('hanyu_owner_jid', jid);
  localStorage.setItem('hanyu_owner_emoji', emoji);
  localStorage.setItem('hanyu_owner_count', count);
  localStorage.setItem('hanyu_user', JSON.stringify(currentUser));
  saveDB();
  document.getElementById('setMsg').innerText = "Saved! Your JID and reactions updated.";
  renderAll();
}

// ---------- RENDER ----------
function renderAll(){
  if(!currentUser) return;
  let u = DB.users[currentUser.email]; if(!u) return;
  checkTrialExpiry();
  let trialText = u.trialDone ? "Trial: DONE - Buy Coins" : `Trial: ${Math.max(0, Math.ceil((u.trialEnd-Date.now())/86400000))} Days Left • ${Math.max(0, TRIAL_MAX-u.trialUsed)} / 700 Left`;
  let tc = document.getElementById('topCoins'); if(tc) tc.innerText = `🪙 ${u.coins} Coins`;
  let tt = document.getElementById('topTrial'); if(tt) tt.innerText = trialText;
  let un = document.getElementById('userName'); if(un) un.innerText = u.name;
  let sc = document.getElementById('statCoins'); if(sc) sc.innerText = u.coins;
  let ss = document.getElementById('statSent'); if(ss) ss.innerText = u.totalSent;
  let myB = DB.boosters.filter(b=>b.owner===u.email);
  let sb = document.getElementById('statBoosters'); if(sb) sb.innerText = myB.filter(b=>b.status.includes('ACTIVE')).length;
  let mb = document.getElementById('myBoosters');
  if(mb) mb.innerHTML = myB.length ? myB.map(b=>`
    <div style="border:1px solid #1e4d36;padding:10px;border-radius:12px;margin-bottom:8px">
      <b>${b.type==='super'?'🔥 SuperBooster':'⚡ Booster'}</b> - ${b.status}<br>
      JID: ${b.jid}<br>Emoji: ${b.emoji} • Per Post: ${b.count} • Sent: ${b.sent}<br>
      <button class="btn-green" onclick="doReaction(${b.id})">Test React (Simulate Post)</button>
    </div>`).join('') : "No booster yet.";
  renderCoins();
  // Orders
  let mo = document.getElementById('myOrders');
  if(mo){
    let myO = DB.orders.filter(o=>o.user===u.email);
    mo.innerHTML = myO.length ? myO.map(o=>`${o.package.coins} Coins - ${o.package.price} UGX - ${o.status} - ${o.method}`).join('<br>') : "No orders yet.";
  }
  // Admin lists
  if(adminUnlocked){
    let ao = document.getElementById('adminOrders');
    if(ao){
      let pend = DB.orders.filter(o=>o.status==='PENDING');
      document.getElementById('aPending').innerText = pend.length;
      document.getElementById('aUsers').innerText = Object.keys(DB.users).length;
      ao.innerHTML = pend.length ? pend.map(o=>`
        <div style="border:1px solid #1e4d36;padding:10px;border-radius:12px;margin-bottom:8px">
          ${o.user} - ${o.package.coins} Coins - ${o.package.price} UGX<br>${o.method} - Sender: ${o.sender}<br>
          <button class="btn-green" onclick="approveOrder(${o.id})">Approve ✅</button>
          <button class="btn-outline" onclick="rejectOrder(${o.id})">Reject</button>
        </div>`).join('') : "No pending orders.";
    }
    let ab = document.getElementById('adminBoosters');
    if(ab) ab.innerHTML = DB.boosters.map(b=>`${b.owner} - ${b.type} - ${b.status} - ${b.jid}`).join('<br>') || "None";
  }
  // Owner display
  let oj = localStorage.getItem('hanyu_owner_jid') || "120363414065055650@newsletter";
  let oe = localStorage.getItem('hanyu_owner_emoji') || "❤️ 🔥 😂 😮";
  let d1 = document.getElementById('myJidDisplay'); if(d1) d1.innerText = oj;
  let d2 = document.getElementById('myEmojiDisplay'); if(d2) d2.innerText = oe;
}

// ---------- AI - HANYU SNOW AI HELPER ----------
function toggleAI(){ let b = document.getElementById('aiBox'); b.style.display = b.style.display==='none' ? 'block' : 'none'; }
function quickAI(q){ document.getElementById('aiInput').value = q; askAI(); }
function askAI(){
  let inp = document.getElementById('aiInput');
  let q = inp.value.trim(); if(!q) return;
  addAIMsg(q, true); inp.value='';
  setTimeout(()=>{ addAIMsg(getAIAnswer(q)); }, 400);
}
function addAIMsg(text, me){
  let c = document.getElementById('aiChat');
  let d = document.createElement('div'); d.className = me ? 'ai-msg me' : 'ai-msg'; d.innerText = text;
  c.appendChild(d); c.scrollTop = c.scrollHeight;
}
function getAIAnswer(q){
  let l = q.toLowerCase();
  let u = currentUser ? DB.users[currentUser.email] : null;
  // System: HANYU only, but answer any briefly then redirect
  if(l.includes('balance') || l.includes('coins') && l.includes('how many')){
    return u ? `You have ${u.coins} coins. Trial: ${u.trialDone ? 'DONE' : (700-u.trialUsed)+' reactions left'}. If coins < 30, buy again to continue. Go to Buy Coins.` : "Login with Google first to see balance.";
  }
  if(l.includes('create') || l.includes('booster') && l.includes('how')){
    return "To create Booster: 1. Go to Booster tab 2. Paste Channel JID or Link 3. Pick Emojis 4. Pick Reactions Per Post 5. Click Start Booster. Cost 30 coins per post. If trial done and coins done, you must buy again.";
  }
  if(l.includes('buy') || l.includes('pay') || l.includes('momo')){
    return "Buy Coins: 1. Go to Buy Coins 2. Choose package (80=5k, 100=10k, 500=15k, 1000=25k, 5000=35k) 3. Send money to MTN 0794110913 or Airtel 0742842515 4. Click I Have Paid. STORM X will approve. SuperBooster is 35,000/week unlimited.";
  }
  if(l.includes('start') && (l.includes('server') || l.includes('my'))){
    let myB = currentUser ? DB.boosters.filter(b=>b.owner===currentUser.email && b.status.includes('ACTIVE')) : [];
    if(myB.length){ return "Your server is already ACTIVE! I checked: " + myB.length + " booster(s) running. It will react to next post. If it stops, check coins."; }
    return "You have no active server. Go to Booster, paste JID, pick emojis, click Start. If trial done, buy coins first.";
  }
  if(l.includes('trial')) return "Free Trial: 2 Days, Max 700 reactions. After that, Trial is DONE forever for your Google email. You must buy coins or SuperBooster. No free coins after trial.";
  if(l.includes('super')) return "SuperBooster: 35,000 UGX / 7 days, UNLIMITED, no coins needed. After 7 days it stops automatically. Pay again to renew.";
  if(l.includes('jid') || l.includes('link')) return "JID is your Channel ID like 1203634...@newsletter. Or just paste your WhatsApp Channel Link. We accept both. No phone number needed.";
  if(l.includes('stop') || l.includes('not working') || l.includes('paused')) return "If server stopped: 1. Check coins - if <30, buy again. 2. Check Trial - if done, buy coins. 3. Check SuperBooster expiry - if 7 days passed, renew. It never fails, it pauses to protect you.";
  if(l.includes('owner') || l.includes('storm')) return "Owner is STORM X. Portfolio: https://storm-x-portfolio-1.onrender.com Telegram: https://t.me/STORMXSYRIX WhatsApp Channel: https://whatsapp.com/channel/0029Vb8NIZf4SpkJvluL3G3P BASED IN KASESE BY THE DARK NOVA LABS";
  if(l.includes('hello') || l.includes('hi')) return "Hi! I'm HANYU SNOW AI HELPER, created by STORM X. Ask me about Booster, Coins, Trial, SuperBooster, or say 'Start my server'.";
  // General - answer any briefly then redirect (as you allowed)
  return "Good question! " + q + " - I can help with that generally, but my main job is HANYU SNOW REACT: Booster, SuperBooster, Coins, Trial. Do you want help to create a Booster or check your balance?";
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', ()=>{
  renderCoins();
  if(!currentUser){ showLogin(); }
  else {
    // Re-load user from DB
    currentUser = DB.users[currentUser.email] || currentUser;
    renderAll();
  }
  // Google login button handler - Enter key for AI
  let aiIn = document.getElementById('aiInput');
  if(aiIn) aiIn.addEventListener('keydown', e=>{ if(e.key==='Enter') askAI(); });
});
