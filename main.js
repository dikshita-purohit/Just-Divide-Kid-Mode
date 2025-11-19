// main.js
'use strict';


const DIFFICULTY_CONFIG = {
  1: { name: 'Easy', pool: [2,2,3,3,4,4,6,6,8,9,10,12] },
  2: { name: 'Medium', pool: [2,3,4,5,6,8,9,10,12,15,16,18] },
  3: { name: 'Hard', pool: [2,3,4,5,6,7,8,9,10,12,15,18,20,24] }
};

// tile(png) art mapping 
const TILE_ASSETS = [
  'assets/blue.png',
  'assets/pink.png',
  'assets/orange.png',
  'assets/red.png',
  'assets/purpule.png'
];

const QUEUE_LENGTH = 2; 


let grid = new Array(16).fill(null); // 4x4 grid row-major
let queue = [];
let keepVal = null;
let score = 0;
let bestScore = 0;
let level = 1;
let trashUses = 1;
let undoStack = [];
let hintsOn = true;
let difficulty = 1;
let seconds = 0;
let timerInterval = null;


const gridWrap = document.getElementById('gridWrap');
const upcomingStack = document.getElementById('upcomingStack');
const keepBox = document.getElementById('keepBox');
const trashBox = document.getElementById('trashBox');
const levelBadge = document.getElementById('levelBadge');
const scoreText = document.getElementById('scoreText');
const bestText = document.getElementById('bestText');
const trashCount = document.getElementById('trashCount');
const timerText = document.getElementById('timer');
const overlay = document.getElementById('overlay');
const goScore = document.getElementById('goScore');
const goBest = document.getElementById('goBest');
const btnRestart = document.getElementById('btnRestart');


function randFromPool() {
  const pool = DIFFICULTY_CONFIG[difficulty].pool;
  return pool[Math.floor(Math.random() * pool.length)];
}
function loadBest() {
  try { bestScore = parseInt(localStorage.getItem('jd_best') || '0', 10) || 0; } catch(e){ bestScore = 0; }
}
function saveBest() {
  try { localStorage.setItem('jd_best', String(bestScore)); } catch(e) {}
}
function pushUndo() {
  
  undoStack.push({ grid: grid.slice(), queue: queue.slice(), keepVal, score, level, trashUses });
  if (undoStack.length > 10) undoStack.shift();
}
function restoreState(s) {
  grid = s.grid.slice(); queue = s.queue.slice(); keepVal = s.keepVal; score = s.score; level = s.level; trashUses = s.trashUses;
  renderAll();
}
function chooseTileAsset(value) {
  const idx = value % TILE_ASSETS.length;
  return TILE_ASSETS[idx];
}

function makeTileDiv(value, small=false) {
  const d = document.createElement('div');
  d.className = 'tile' + (small ? ' small' : '');
  d.textContent = String(value);
  d.style.backgroundImage = `url("${chooseTileAsset(value)}")`;

  d.style.color = '#012';
  return d;
}

function renderGrid() {
  gridWrap.innerHTML = '';
  for (let i = 0; i < 16; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.index = i;
    const bg = document.createElement('div'); bg.className = 'slot-bg';
    slot.appendChild(bg);

    if (grid[i] != null) {
      const tile = makeTileDiv(grid[i]);
      tile.style.position = 'static';
      tile.style.cursor = 'default';
      tile.draggable = false;
      slot.appendChild(tile);
    }
    // click to place top tile if empty
    slot.addEventListener('click', ()=> {
      if (grid[i] == null && queue[0] != null) {
        dropOnCell(i, queue[0]);
      }
    });
    gridWrap.appendChild(slot);
  }
}

function renderUpcoming() {
  upcomingStack.innerHTML = '';
  for (let i = 0; i < QUEUE_LENGTH; i++) {
    const val = queue[i] == null ? null : queue[i];
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    const box = document.createElement('div'); box.className = 'slot-box';
    if (val == null) {
      box.textContent = '-';
    } else {
      const tile = makeTileDiv(val, i>0);
      tile.style.position = 'relative';
      tile.draggable = (i === 0);
      // drag events for desktop
      if (i === 0) {
        tile.addEventListener('dragstart', (ev) => {
          ev.dataTransfer.setData('text/plain', JSON.stringify({type:'queue', value: val}));
          const crt = tile.cloneNode(true); crt.style.position='absolute'; crt.style.top='-1000px'; document.body.appendChild(crt);
          ev.dataTransfer.setDragImage(crt, 60, 60); setTimeout(()=>crt.remove(),0);
        });
        tile.addEventListener('pointerdown', (ev) => {
          if (ev.pointerType === 'touch') startPointerDrag(ev, {type:'queue', value: val});
        });
      }
      box.appendChild(tile);
    }
    wrapper.appendChild(box);
    upcomingStack.appendChild(wrapper);
  }
}
function renderKeep() {
  keepBox.innerHTML = ""; 

  const box = document.createElement("div");
  box.className = "slot-box";

  const keepBg = document.createElement("div");
  keepBg.style = `
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-image: url('assets/keep.png');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    font-weight: bold;
  `;
  keepBg.textContent = " ";

  box.appendChild(keepBg);

  // add tile if exists
  if (keepVal != null) {
    const tile = makeTileDiv(keepVal);
    tile.draggable = true;

    tile.addEventListener('dragstart', (ev) => {
      ev.dataTransfer.setData('text/plain', JSON.stringify({ type: 'keep', value: keepVal }));
      const crt = tile.cloneNode(true);
      crt.style.position = 'absolute';
      crt.style.top = '-1000px';
      document.body.appendChild(crt);
      ev.dataTransfer.setDragImage(crt, 60, 60);
      setTimeout(() => crt.remove(), 0);
    });

    tile.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType === 'touch') {
        startPointerDrag(ev, { type: 'keep', value: keepVal });
      }
    });

    box.appendChild(tile);
  }

  keepBox.appendChild(box);
}




function renderTrash() {
  trashBox.innerHTML = ""; 

  const box = document.createElement("div");
  box.className = "slot-box";

  const trashBg = document.createElement("div");
  trashBg.style = `
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-image: url('assets/trash.png');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    font-weight: bold;
  `;
  trashBg.textContent = "";

  box.appendChild(trashBg);

  trashBox.appendChild(box);
  trashCount.textContent = `Trash: ${trashUses}`;
}


function renderBadges() {
  levelBadge.textContent = `LEVEL ${level}`;
  scoreText.textContent = `Score: ${score}`;
  bestText.textContent = `Best: ${bestScore}`;
}

function updateHintsVisuals() {
  const slots = Array.from(gridWrap.children);
  slots.forEach((slot, idx) => {
    slot.classList.remove('hint');
    if (hintsOn && queue[0] && grid[idx] == null && canMergeAt(queue[0], idx)) {
      slot.classList.add('hint');
    }
  });
}

function renderAll() {
  renderGrid();
  renderUpcoming();
  renderKeep();
  renderTrash();
  renderBadges();
  updateHintsVisuals();
}

function canMergeAt(val, emptyIndex) {
  // check neighbors up/down/left/right
  const r = Math.floor(emptyIndex / 4);
  const c = emptyIndex % 4;
  const neighbors = [{r:r-1,c:c},{r:r+1,c:c},{r:r,c:c-1},{r:r,c:c+1}];
  for (const p of neighbors) {
    if (p.r < 0 || p.r > 3 || p.c < 0 || p.c > 3) continue;
    const ni = p.r * 4 + p.c;
    const nval = grid[ni];
    if (nval == null) continue;
    if (nval === val) return true;
    const larger = Math.max(nval, val);
    const smaller = Math.min(nval, val);
    if (smaller > 0 && larger % smaller === 0) return true;
  }
  return false;
}

function performMergeAt(cellIndex, placedValue) {
  grid[cellIndex] = placedValue;
  let changed = false;

  function attemptMerge(targetIndex) {
    const tval = grid[targetIndex];
    if (tval == null) return false;
    const r = Math.floor(targetIndex / 4);
    const c = targetIndex % 4;
    const order = [{r:r-1,c:c},{r:r,c:c+1},{r:r+1,c:c},{r:r,c:c-1}];
    for (const p of order) {
      if (p.r < 0 || p.r > 3 || p.c < 0 || p.c > 3) continue;
      const ni = p.r * 4 + p.c;
      const nval = grid[ni];
      if (nval == null) continue;
      if (nval === tval) {
        grid[targetIndex] = null;
        grid[ni] = null;
        score += 1;
        changed = true;
        return true;
      }
      const larger = Math.max(nval, tval);
      const smaller = Math.min(nval, tval);
      if (smaller > 0 && larger % smaller === 0) {
        const result = larger / smaller;
        const largerIsN = (nval === larger);
        const largerIdx = largerIsN ? ni : targetIndex;
        const smallerIdx = largerIsN ? targetIndex : ni;
        grid[smallerIdx] = null;
        if (result === 1) {
          grid[largerIdx] = null;
        } else {
          grid[largerIdx] = result;
        }
        score += Math.floor(larger / Math.max(1, result));
        changed = true;
        return true;
      }
    }
    return false;
  }

  let loop = 0;
  while (true) {
    loop++;
    let any = false;
    for (let i = 0; i < 16; i++) {
      if (grid[i] == null) continue;
      if (attemptMerge(i)) any = true;
    }
    if (!any) break;
    if (loop > 20) break; // fail-safe
  }

  for (let i = 0; i < 16; i++) {
    if (grid[i] === 1) grid[i] = null;
  }

  return changed;
}

function refillQueue() {
  while (queue.length < QUEUE_LENGTH) queue.push(randFromPool());
}

function dropOnCell(cellIndex, value) {
  pushUndo();
  grid[cellIndex] = null; // ensure empty just before placing
  performMergeAt(cellIndex, value);
  queue.shift();
  refillQueue();
  const newLevel = Math.floor(score / 10) + 1;
  if (newLevel > level) {
    level = newLevel;
    trashUses += 1; // reward
  }
  if (score > bestScore) { bestScore = score; saveBest(); }
  renderAll();
  checkGameOver();
}

function dropOnKeep(value) {
  pushUndo();
  const old = keepVal;
  keepVal = value;
  queue.shift();
  if (old != null) queue.unshift(old);
  refillQueue();
  renderAll();
}

function dropOnTrash(value) {
  if (trashUses <= 0) {
    // small shake
    trashBox.animate([{transform:'scale(1)'},{transform:'scale(1.06)'},{transform:'scale(1)'}], { duration: 220 });
    return;
  }
  pushUndo();
  trashUses -= 1;
  queue.shift();
  refillQueue();
  renderAll();
}


function checkGameOver() {
  const isFull = grid.every(v => v != null);
  if (!isFull) return;
  // any adjacent merges possible?
  for (let i = 0; i < 16; i++) {
    const v = grid[i];
    if (v == null) continue;
    const r = Math.floor(i / 4), c = i % 4;
    const neighbors = [{r:r-1,c:c},{r:r+1,c:c},{r:r,c:c-1},{r:r,c:c+1}];
    for (const p of neighbors) {
      if (p.r < 0 || p.r > 3 || p.c < 0 || p.c > 3) continue;
      const ni = p.r * 4 + p.c;
      const n = grid[ni];
      if (n == null) continue;
      if (n === v) return;
      const larger = Math.max(n, v), smaller = Math.min(n, v);
      if (smaller > 0 && larger % smaller === 0) return;
    }
  }
  showGameOver();
}

function showGameOver() {
  overlay.classList.add('show');
  goScore.textContent = `Score: ${score}`;
  goBest.textContent = `Best: ${bestScore}`;
}


document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => {
  e.preventDefault();
  const raw = e.dataTransfer.getData('text/plain');
  if (!raw) return;
  try {
    const payload = JSON.parse(raw);
    const target = document.elementFromPoint(e.clientX, e.clientY);
    handleDropAtElement(payload, target);
  } catch (err) {
    // ignore
  }
});

keepBox.addEventListener('dragover', e => e.preventDefault());
trashBox.addEventListener('dragover', e => e.preventDefault());
keepBox.addEventListener('drop', e => {
  e.preventDefault();
  try {
    const p = JSON.parse(e.dataTransfer.getData('text/plain'));
    if (p && p.value) dropOnKeep(p.value);
  } catch(e){}
});
trashBox.addEventListener('drop', e => {
  e.preventDefault();
  try {
    const p = JSON.parse(e.dataTransfer.getData('text/plain'));
    if (p && p.value) dropOnTrash(p.value);
  } catch(e){}
});

function handleDropAtElement(payload, el) {
  let cur = el;
  while (cur && cur !== document.body) {
    if (cur.classList && cur.classList.contains('slot')) {
      const idx = parseInt(cur.dataset.index, 10);
      if (grid[idx] == null && payload && typeof payload.value !== 'undefined') {
        dropOnCell(idx, payload.value);
        // If drag source was keep, clear keepVal
        if (payload.type === 'keep') {
          keepVal = null;
        }
      }
      renderAll();
      return;
    }
    cur = cur.parentElement;
  }
  // If dropped outside grid, e.g., trash
  if (payload.type === 'keep') {
    keepVal = null;
  }
  renderAll(); // snapback visual
}



let pointerDrag = null;
function startPointerDrag(ev, payload) {
  ev.preventDefault();
  const tile = makeTileDiv(payload.value);
  tile.style.position = 'fixed';
  tile.style.left = (ev.clientX - 0.5 * parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slot-size'))) + 'px';
  tile.style.top = (ev.clientY - 0.5 * parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slot-size'))) + 'px';
  tile.style.zIndex = 9999;
  document.body.appendChild(tile);
  pointerDrag = { el: tile, payload };

  function move(e) {
    if (!pointerDrag) return;
    pointerDrag.el.style.left = (e.clientX - 0.5 * parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slot-size'))) + 'px';
    pointerDrag.el.style.top = (e.clientY - 0.5 * parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slot-size'))) + 'px';
  }
  function up(e) {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
    handleDropAtElement(pointerDrag.payload, dropTarget);
    pointerDrag.el.remove();
    pointerDrag = null;
  }

  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
}


document.addEventListener('keydown', (e) => {
  if (e.key === 'z' || e.key === 'Z') {
    if (undoStack.length === 0) return;
    const s = undoStack.pop(); restoreState(s);
  } else if (e.key === 'r' || e.key === 'R') {
    restartGame();
  } else if (e.key === 'g' || e.key === 'G') {
    hintsOn = !hintsOn; updateHintsVisuals();
  } else if (e.key === '1') { difficulty = 1; restartGame(); }
  else if (e.key === '2') { difficulty = 2; restartGame(); }
  else if (e.key === '3') { difficulty = 3; restartGame(); }
});


function startTimer() {
  timerText.textContent = `Time: ${seconds}s`;
  timerInterval = setInterval(() => {
    seconds += 1;
    timerText.textContent = `Time: ${seconds}s`;
  }, 1000);
}


function restartGame() {
  grid = new Array(16).fill(null);
  queue = [];
  keepVal = null;
  score = 0;
  level = 1;
  trashUses = 1;
  undoStack = [];
  refillQueue();
  renderAll();
  seconds = 0;
  if (timerInterval) clearInterval(timerInterval);
  startTimer();
  overlay.classList.remove('show');
}

function init() {
  loadBest();
  refillQueue();
  renderAll();
  startTimer();
  btnRestart.addEventListener('click', ()=> { restartGame(); overlay.classList.remove('show'); });
}


init();
