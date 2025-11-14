export const placedBalls = []; // all placed grid points
export const deadspace = []; //global array to collect enclosed empty coordinates, to prevent placing new points
export const enclosures = [];



//calculates if you captured something (instrumented with debug logs)
export function detectCapture(placedBalls, players) {
  if (placedBalls.length < 6) { return null; }

  const lastPlaced = placedBalls[placedBalls.length - 1];
  const playerId = lastPlaced.player; // numeric player id as stored on ball
  const color = lastPlaced.color;

  const key = (x, y) => `${x},${y}`;

  // map of alive balls by position
  const pos2ball = new Map();
  for (const b of placedBalls) if (b.alive) pos2ball.set(key(b.x, b.y), b);

  // quick list of same-color alive nodes
  const sameColor = placedBalls.filter(p => p.alive && p.color === color).map(p => [p.x, p.y]);
  if (sameColor.length < 4) { return null; }

  const nodeSet = new Set(sameColor.map(([x, y]) => key(x, y)));

  // helper checks
  function checkValidity(x, y, pid) {
    const k = key(x, y);
    const pt = pos2ball.get(k);
    const res = !!pt && pt.player === pid && pt.alive;
    return res;
  }
  function isEmpty(x, y) { const e = !pos2ball.has(key(x, y)); return e; }

  // direction vectors (codes 1..16)
  const dirVec = {
    1: [1, 1], 2: [1, -1], 3: [-1, -1], 4: [-1, 1],
    5: [1, 0], 6: [0, 1], 7: [-1, 0], 8: [0, -1],
    9: [2, 0], 10: [0, 2], 11: [-2, 0], 12: [0, -2],
    13: [1, 0], 14: [0, 1], 15: [-1, 0], 16: [0, -1]
  };

  // allowed next directions per your spec
  const allowedNext = {
    1: [4, 6, 1, 5, 2],
    2: [1, 5, 2, 8, 4],
    3: [4, 7, 3, 8, 2],
    4: [1, 3, 6, 4, 7],
    5: [1, 5, 2],
    6: [1, 6, 4],
    7: [4, 7, 3],
    8: [2, 8, 3],
    9: [13],
    10: [14],
    11: [15],
    12: [16],
    13: [6, 1, 5, 2, 8],
    14: [5, 1, 6, 4, 7],
    15: [8, 4, 7, 3, 6],
    16: [7, 2, 8, 3, 5]
  };

  // mapping for jump intermediary: when cardinal 5..8 finds empty immediate cell, we try intermediate 9..12
  const toIntermediary = { 5: 9, 6: 10, 7: 11, 8: 12 };
  // mapping from intermediary (9..12) to post-jump codes (13..16)
  const interToPost = { 9: 13, 10: 14, 11: 15, 12: 16 };
  // mapping post-jump back to canonical cardinal parent (for clarity)
  const postToCardinal = { 13: 5, 14: 6, 15: 7, 16: 8 };

  // normalize cycle to canonical string to dedupe
  function normalizeCycle(cycle) {
    const n = cycle.length;
    const variants = [];
    for (let i = 0; i < n; i++) {
      const rot = [];
      for (let j = 0; j < n; j++) rot.push(cycle[(i + j) % n]);
      variants.push(rot);
    }
    const rev = variants.map(v => [...v].reverse());
    const all = variants.concat(rev);
    const strs = all.map(v => v.map(([x, y]) => `${x},${y}`).join('|'));
    return strs.reduce((a, b) => (a < b ? a : b));
  }

  // iterative propagation stack
  const origin = [lastPlaced.x, lastPlaced.y];
  const originKey = key(...origin);
  const maxPath = 100;

  const cyclesSet = new Set();
  const cycles = [];

  const stack = [];
  // push initial directions from origin (origin can try all 1..8)
  for (let dir = 1; dir <= 8; dir++) {
    const [dx, dy] = dirVec[dir];
    const nx = origin[0] + dx, ny = origin[1] + dy;
    if (checkValidity(nx, ny, playerId)) {
      stack.push({ path: [[...origin], [nx, ny]], dir });
    } else if ((dir >= 5 && dir <= 8) && isEmpty(nx, ny)) {
      // try intermediary double-step from origin
      const dx2 = dx * 2, dy2 = dy * 2;
      const jx = origin[0] + dx2, jy = origin[1] + dy2;
      if (checkValidity(jx, jy, playerId)) {
        const inter = toIntermediary[dir];
        const post = interToPost[inter];
        // set dir to post-jump (13..16) to continue from that landed cell
        stack.push({ path: [[...origin], [jx, jy]], dir: post });
      }
    }
  }

  // Explore iteratively
  while (stack.length) {
    const node = stack.pop();
    const path = node.path;
    const cur = path[path.length - 1];
    const curKey = key(...cur);

    if (path.length > maxPath) { continue; }

    const dir = node.dir;
    const nextDirs = allowedNext[dir] || [];

    for (const nd of nextDirs) {
      // compute basic step vector for nd (if nd is 9..12 or 13..16 this vector exists in dirVec)
      const vec = dirVec[nd];
      if (!vec) { continue; }
      let tx = cur[0] + vec[0], ty = cur[1] + vec[1];

      // If nd is 13..16 (post-jump) we already landed after a jump and should use normal neighbor handling
      // If nd is 5..8 (cardinal) and immediate cell is empty from cur, attempt intermediary jump to 9..12 -> post
      if (nd >= 5 && nd <= 8) {
        // immediate target tx,ty is the adjacent cell in that cardinal direction
        if (isEmpty(tx, ty)) {
          // attempt jump to double cell
          const inter = toIntermediary[nd];       // 9..12
          const post = interToPost[inter];       // 13..16
          const dx2 = dirVec[inter][0], dy2 = dirVec[inter][1];
          const jx = cur[0] + dx2, jy = cur[1] + dy2;
          if (checkValidity(jx, jy, playerId)) {
            // check if we formed cycle with jump target
            const alreadyIndex = path.findIndex(([x, y]) => x === jx && y === jy);
            if (alreadyIndex !== -1) {
              const cyc = path.slice(alreadyIndex);
              if (cyc.length >= 4) {
                const norm = normalizeCycle(cyc);
                if (!cyclesSet.has(norm)) { cyclesSet.add(norm); cycles.push(cyc); }
              }
            } else {
              const prev = path.length >= 2 ? path[path.length - 2] : null;
              if (prev && prev[0] === jx && prev[1] === jy) { }
              else {
                stack.push({ path: [...path, [jx, jy]], dir: post });
              }
            }
          } else {
          }
          // do not try moving into the empty immediate cell as a normal neighbor
          continue;
        }
      }

      // For intermediaries nd in 9..12 (if ever encountered directly), interpret as a jump target already:
      // handled by checking validity below (tx,ty will be double-step cell)
      // For all cases, perform validity check
      if (checkValidity(tx, ty, playerId)) {
        const alreadyIndex = path.findIndex(([x, y]) => x === tx && y === ty);
        if (alreadyIndex !== -1) {
          // cycle found
          const cyc = path.slice(alreadyIndex);
          if (cyc.length >= 4) {
            const norm = normalizeCycle(cyc);
            if (!cyclesSet.has(norm)) { cyclesSet.add(norm); cycles.push(cyc); }
          }
        } else {
          // avoid immediate backtrack to parent
          const prev = path.length >= 2 ? path[path.length - 2] : null;
          if (prev && prev[0] === tx && prev[1] === ty) { continue; }

          // If nd is intermediary (9..12) we should continue using the corresponding post-jump code
          let pushDir = nd;
          if (nd >= 9 && nd <= 12) { pushDir = interToPost[nd]; }

          // If nd is post-jump 13..16, we may want to use its mapped allowedNext already (we are already doing so)
          stack.push({ path: [...path, [tx, ty]], dir: pushDir });
        }
      } else {
      }
    } // end for nextDirs
  } // end while stack
  if (cycles.length === 0) { return null; }

  // point-in-polygon test (same as before)
  function pointInPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // For each cycle get enemies inside
  let totalCaptured = 0;
  for (const cyc of cycles) {
    const wallsSet = new Set(cyc.map(([x, y]) => key(x, y)));
    const xs = cyc.map(p => p[0]), ys = cyc.map(p => p[1]);
    const minX = Math.min(...xs) - 1, maxX = Math.max(...xs) + 1;
    const minY = Math.min(...ys) - 1, maxY = Math.max(...ys) + 1;
    const enemies = [];
    const empties = [];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const k = key(x, y);
        if (wallsSet.has(k)) continue;
        if (pointInPoly(x, y, cyc)) {
          const ball = pos2ball.get(k);
          if (ball) {
            if (ball.player !== playerId && ball.alive) enemies.push([x, y]);
          } else {
            empties.push([x, y]);
          }
        }
      }
    }

    if (enemies.length === 0) { continue; }

    // mark captured
    for (const [ex, ey] of enemies) {
      for (const b of placedBalls) {
        if (b.x === ex && b.y === ey && b.alive) {
          b.alive = false;
          // award score to current player
          players[playerId].score = (players[playerId].score || 0) + 1;
          totalCaptured++;
        }
      }
    }

    // add empties to deadspace
    for (const pt of empties) if (!deadspace.some(([x, y]) => x === pt[0] && y === pt[1])) {
      deadspace.push(pt);
    }

    // register enclosure and draw polygon
    enclosures.push([cyc, playerId]);
  }
  return totalCaptured > 0 ? { captured: totalCaptured, cycles } : null;
}
