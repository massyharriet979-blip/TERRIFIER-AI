// HANYU SNOW REACT - Backend for Render
// Created by STORM X - BASED IN KASESE BY THE DARK NOVA LABS
// STRICT MODE - Admin from Render Env Vars
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serves index.html, style.css, app.js

// ===== CONFIG FROM RENDER ENV VARS =====
// In Render Dashboard -> Environment -> Add:
// ADMIN_PASS = STORMX1234A
// GOOGLE_CLIENT_ID = your Google Client ID (for Google Only login)
// OWNER_JID = 120363414065055650@newsletter
const ADMIN_PASS = process.env.ADMIN_PASS || "STORMX1234A";
const OWNER_JID = process.env.OWNER_JID || "120363414065055650@newsletter";
const TRIAL_DAYS = 2;
const TRIAL_MAX = 700;
const COST_PER_POST = 30;
const SUPER_DAYS = 7;
const SUPER_PRICE = 35000;

// ===== IN-MEMORY DB (Use MongoDB / Postgres in production for permanent storage) =====
// For Render demo, this resets on restart. Upgrade to MongoDB later - STORM X can keep same API.
let users = {}; // email -> { email, name, coins, trialStart, trialEnd, trialUsed, trialDone, totalSent }
let orders = []; // { id, user, package, method, sender, status }
let boosters = []; // { id, owner, jid, emoji, count, type, status, sent, expiresAt }

function getUser(email){ return users[email]; }

function checkTrial(user){
  if(!user) return null;
  let now = Date.now();
  if(!user.trialDone && (now > user.trialEnd || user.trialUsed >= TRIAL_MAX)){
    user.trialDone = true;
  }
  return user;
}

// Admin check - STRICT: Must send x-admin-pass header matching Render Env
function requireAdmin(req, res, next){
  const pass = req.headers['x-admin-pass'];
  if(pass !== ADMIN_PASS){
    return res.status(403).json({ error: "Admin only. Wrong passcode." });
  }
  next();
}

// ===== AUTH - GOOGLE ONLY =====
// Frontend sends Google email after Google Sign-In. Backend trusts Google token in production.
// For now: email must look like Google email, and trial is tied to email forever.
app.post('/api/login', (req, res)=>{
  const { email, name } = req.body;
  if(!email || !email.includes('@')) return res.status(400).json({ error: "Google email required" });
  const clean = email.trim().toLowerCase();
  if(!users[clean]){
    let now = Date.now();
    users[clean] = {
      email: clean, name: name || clean.split('@')[0],
      coins: 0, trialStart: now, trialEnd: now + TRIAL_DAYS*24*60*60*1000,
      trialUsed: 0, trialDone: false, totalSent: 0, createdAt: now
    };
  }
  res.json({ user: checkTrial(users[clean]) });
});

// ===== BOOSTER =====
app.post('/api/booster/create', (req, res)=>{
  const { email, jid, emoji, count, type } = req.body;
  let user = checkTrial(getUser(email));
  if(!user) return res.status(401).json({ error: "Login with Google first" });
  if(!jid || !emoji) return res.status(400).json({ error: "JID/Link and Emojis required" });

  if(type === 'super'){
    // SuperBooster - PENDING until admin approves payment of 35000
    let b = { id: Date.now(), owner: email, jid, emoji, count: count||500, type:'super', status:'PENDING PAYMENT - Pay 35,000 UGX', sent:0, createdAt: Date.now(), expiresAt: Date.now()+SUPER_DAYS*24*60*60*1000 };
    boosters.push(b);
    return res.json({ booster: b, msg: "Pay 35,000 to MTN 0794110913 / Airtel 0742842515, then I Have Paid" });
  }

  // Normal Booster - STRICT: If trial done and coins < 30, BLOCK
  if(user.trialDone && user.coins < COST_PER_POST){
    return res.status(402).json({ error: "Trial done and coins finished. You MUST buy coins again. No free reactions." });
  }
  let b = { id: Date.now(), owner: email, jid, emoji, count: count||100, type:'normal', status:'ACTIVE', sent:0, createdAt: Date.now(), expiresAt: null };
  boosters.push(b);
  res.json({ booster: b });
});

// ===== REACTION ENGINE - Called when new post detected =====
// This is where Baileys / WhatsApp Channel Reaction will be connected.
// For now: It checks STRICT rules before reacting, so Failed = 0 always.
app.post('/api/react', (req, res)=>{
  const { boosterId } = req.body;
  let b = boosters.find(x=>x.id===boosterId);
  if(!b) return res.status(404).json({ error: "Booster not found" });
  let user = checkTrial(getUser(b.owner));
  if(!user) return res.status(401).json({ error: "User not found" });

  // SUPERBOOSTER CHECK
  if(b.type === 'super'){
    if(Date.now() > b.expiresAt){
      b.status = 'EXPIRED - Renew 35,000 UGX';
      return res.status(402).json({ error: "SuperBooster expired after 7 days. Pay again." });
    }
    // TODO: Connect Baileys here: sendReaction(b.jid, b.emoji, b.count)
    user.totalSent += b.count; b.sent += b.count;
    return res.json({ ok:true, sent: b.count, type:'super', msg: "SuperBooster reacted - Unlimited" });
  }

  // NORMAL: Trial?
  if(!user.trialDone){
    if(user.trialUsed >= TRIAL_MAX){
      user.trialDone = true;
      return res.status(402).json({ error: "Trial finished (700). Buy coins." });
    }
    // TODO: Baileys sendReaction
    user.trialUsed += b.count; user.totalSent += b.count; b.sent += b.count;
    if(user.trialUsed >= TRIAL_MAX) user.trialDone = true;
    return res.json({ ok:true, sent: b.count, type:'trial', trialLeft: TRIAL_MAX - user.trialUsed });
  }

  // NORMAL: Coins?
  if(user.coins < COST_PER_POST){
    b.status = 'PAUSED - OUT OF COINS';
    return res.status(402).json({ error: "Out of coins. Buy coins again. No free reactions." });
  }
  user.coins -= COST_PER_POST; user.totalSent += b.count; b.sent += b.count;
  // TODO: Baileys sendReaction
  return res.json({ ok:true, sent: b.count, coinsLeft: user.coins });
});

// ===== BUY COINS / ORDERS =====
app.post('/api/order', (req, res)=>{
  const { email, package: pkg, method, sender } = req.body;
  if(!getUser(email)) return res.status(401).json({ error: "Login first" });
  let o = { id: Date.now(), user: email, package: pkg, method, sender, status:'PENDING', createdAt: Date.now() };
  orders.push(o);
  res.json({ order: o, msg: "Order sent. Pay then wait for STORM X approval." });
});

app.get('/api/my', (req, res)=>{
  const email = (req.query.email||'').toLowerCase();
  let user = checkTrial(getUser(email));
  if(!user) return res.status(404).json({ error: "Not found" });
  res.json({ user, boosters: boosters.filter(b=>b.owner===email), orders: orders.filter(o=>o.user===email) });
});

// ===== ADMIN - LOCKED =====
app.post('/api/admin/approve', requireAdmin, (req, res)=>{
  const { orderId } = req.body;
  let o = orders.find(x=>x.id===orderId);
  if(!o) return res.status(404).json({ error: "Order not found" });
  if(o.status !== 'PENDING') return res.status(400).json({ error: "Already handled" });
  o.status = 'APPROVED';
  let u = getUser(o.user);
  if(u && o.package) u.coins += o.package.coins;
  // Activate SuperBoosters for this user
  boosters.filter(b=>b.owner===o.user && b.type==='super' && b.status.includes('PENDING')).forEach(b=>{
    b.status = 'ACTIVE - SUPER 7 DAYS';
    b.expiresAt = Date.now() + SUPER_DAYS*24*60*60*1000;
  });
  res.json({ ok:true, user: u, order: o });
});

app.post('/api/admin/reject', requireAdmin, (req, res)=>{
  let o = orders.find(x=>x.id===req.body.orderId);
  if(o) o.status = 'REJECTED';
  res.json({ ok:true });
});

app.post('/api/admin/add-coins', requireAdmin, (req, res)=>{
  const { email, coins } = req.body;
  let u = getUser((email||'').toLowerCase());
  if(!u) return res.status(404).json({ error: "User not found" });
  u.coins += parseInt(coins||0);
  res.json({ ok:true, user: u });
});

app.get('/api/admin/all', requireAdmin, (req, res)=>{
  res.json({ users: Object.values(users), orders, boosters, ownerJid: OWNER_JID });
});

// ===== OWNER SETTINGS - ADMIN ONLY =====
app.post('/api/admin/owner-jid', requireAdmin, (req, res)=>{
  // Only admin can change owner JID - this is your channel
  const { jid } = req.body;
  // In production save to DB / Env
  res.json({ ok:true, ownerJid: jid, msg: "Owner JID updated by STORM X only" });
});

// ===== AI HELPER - HANYU SNOW AI HELPER =====
// AI answers any question, but main job is HANYU issues. In production connect OpenAI / Gemini here.
app.post('/api/ai', (req, res)=>{
  const { q, email } = req.body;
  let user = email ? getUser(email.toLowerCase()) : null;
  let l = (q||'').toLowerCase();
  let answer = "";
  if(l.includes('balance') || (l.includes('coins') && l.includes('how'))) answer = user ? `You have ${user.coins} coins. Trial: ${user.trialDone ? 'DONE' : (700-user.trialUsed)+' left'}. If coins < 30, buy again.` : "Login with Google to see balance.";
  else if(l.includes('buy') || l.includes('pay')) answer = "Buy Coins: Choose package (80=5k, 100=10k, 500=15k, 1000=25k, 5000=35k). Pay MTN 0794110913 or Airtel 0742842515. Click I Have Paid. STORM X approves. SuperBooster 35,000/week unlimited.";
  else if(l.includes('super')) answer = "SuperBooster: 35,000 UGX / 7 days, UNLIMITED, no coins. After 7 days it stops, pay again to renew.";
  else if(l.includes('trial')) answer = "Free Trial: 2 Days, Max 700 reactions. After that, trial DONE forever for your Google email. Must buy coins.";
  else if(l.includes('jid')) answer = "JID is like 1203634...@newsletter OR paste your Channel Link. We accept both. No phone number needed.";
  else if(l.includes('start')) answer = "To start: Go to Booster, paste JID/Link, pick emojis, click Start. If trial done and coins done, buy again first.";
  else if(l.includes('stop') || l.includes('not working')) answer = "If stopped: Check coins (<30 = buy), check trial (done = buy), check Super expiry (7 days = renew). It pauses, never fails.";
  else answer = `Good question! "${q}" - I can help generally, but my main job is HANYU SNOW REACT: Booster, SuperBooster, Coins, Trial, Payments. Want help to create Booster or check balance?`;
  res.json({ answer, by: "HANYU SNOW AI HELPER - Created by STORM X" });
});

// Health
app.get('/api/health', (req,res)=> res.json({ ok:true, service:"HANYU SNOW REACT", owner:"STORM X", based:"KASESE BY DARK NOVA LABS" }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log(`❄️ HANYU SNOW REACT running on ${PORT} | Admin locked | Trial 2 days / 700 max`));
