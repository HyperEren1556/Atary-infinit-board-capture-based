import { deadspace } from "./detectCapture.mjs";
import { players } from "./player.mjs";
import { checkOccupied, currentPlayer } from "./undo-redo.mjs";





// === CANVAS & CONTEXT INITIALIZATION ===
export const canvas = document.getElementById('c');
export const ctx = canvas.getContext('2d');  




// === GRID CONFIGURATION ===
const baseGridPx = 40; // each grid unit equals 40 pixels
export let scale = 1.0; // zoom scale
export let camera = { x: 0, y: 0 }; // camera center in world coordinates
let size = 0.5



let backgroundColor = "#fff"



// === MAIN DRAW LOOP ===
export function drawAll(placedBalls, enclosures, players, hoverSnap, currentPlayer){
    ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);
    ctx.fillStyle = backgroundColor ;
    ctx.fillRect(0,0,canvas.clientWidth,canvas.clientHeight);
    
    drawGrid();

    // Draw all placed points
    for(const b of placedBalls){ drawShapeAtWorld(b.x,b.y,size,b.shape,b.color,true); }



    // Draw hovered preview if empty position

    //preview point
    if(!(checkOccupied(placedBalls, deadspace, hoverSnap.x, hoverSnap.y))) drawShapeAtWorld(hoverSnap.x,hoverSnap.y,size,players[currentPlayer].shape,players[currentPlayer].color,false);
    if (enclosures.length > 0){
      enclosures.forEach(element => {
        drawColoredPolygon(element[0],players[element[1]].color);
    

      });

    };

    drawUniformBorderShadow(ctx, players[currentPlayer].color, 0.3, size*50);

}


export function updateOccupied(){
      const occupied = placedBalls.some(b=>b.x===hoverSnap.x && b.y===hoverSnap.y);
}







// === DRAWING GRID ===
function drawGrid(){
    const w = canvas.clientWidth; const h = canvas.clientHeight;
    const halfWUnits = (w/2) / (baseGridPx * scale);
    const halfHUnits = (h/2) / (baseGridPx * scale);
    const left = Math.floor(camera.x - halfWUnits) - 2;
    const right = Math.ceil(camera.x + halfWUnits) + 2;
    const bottom = Math.floor(camera.y - halfHUnits) - 2;
    const top = Math.ceil(camera.y + halfHUnits) + 2;

    // Draw minor grid lines
    ctx.lineWidth = 1; ctx.globalAlpha = 0.55; ctx.strokeStyle = '#222';
    for(let x=left;x<=right;x++){
      const sx = Math.round(worldToScreen(x,0).x)+0.5;
      ctx.beginPath(); ctx.moveTo(sx,0); ctx.lineTo(sx,h); ctx.stroke();
    }
    for(let y=bottom;y<=top;y++){
      const sy = Math.round(worldToScreen(0,y).y)+0.5;
      ctx.beginPath(); ctx.moveTo(0,sy); ctx.lineTo(w,sy); ctx.stroke();
    }

    // Draw X and Y axes thicker
    ctx.globalAlpha = 1; ctx.lineWidth = 1.8; ctx.strokeStyle = '#000';
    const axisX = Math.round(worldToScreen(0,0).x)+0.5; ctx.beginPath(); ctx.moveTo(axisX,0); ctx.lineTo(axisX,h); ctx.stroke();
    const axisY = Math.round(worldToScreen(0,0).y)+0.5; ctx.beginPath(); ctx.moveTo(0,axisY); ctx.lineTo(w,axisY); ctx.stroke();
}



// drawColoredPolygon(points, color): provided drawing function
export function drawColoredPolygon(points, color="#808080") {
    if (points.length < 3) return; // need at least a triangle

    // Convert all world points to screen coordinates
    const screenPoints = points.map(([wx, wy]) => worldToScreen(wx, wy));

    ctx.save();
    ctx.beginPath();

    // Move to the first point
    ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
    // Draw lines between all points
    for (let i = 1; i < screenPoints.length; i++) {
      ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
    }
    // Close the shape
    ctx.closePath();

    // Fill (transparent)
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = color;
    ctx.fill();

    // Stroke (thicker and slightly less transparent)
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 4 * scale; // scales with zoom
    ctx.strokeStyle = color;
    ctx.stroke();

    ctx.restore();
}



// === SHAPE DRAWING HELPERS ===
function drawShapeAtWorld(x,y,size,shape,color,fill=true){
    const p = worldToScreen(x,y);
    drawShapeAtScreen(p.x,p.y,size*baseGridPx*scale,shape,color,fill);
}



function drawShapeAtScreen(cx, cy, pxSize, shape, color, fill = true) {
    const r = pxSize / 2;
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, pxSize * 0.08);

    // Helper to draw regular polygons
    const drawPolygon = (sides, rotation = -Math.PI / 2) => {
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const angle = rotation + (i * 2 * Math.PI) / sides;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      fill ? ctx.fill() : ctx.stroke();
    };

    switch (shape) {
      case 'circle':
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        fill ? ctx.fill() : ctx.stroke();
        break;

      case 'square':
        ctx.rect(cx - r, cy - r, 2 * r, 2 * r);
        fill ? ctx.fill() : ctx.stroke();
        break;

      case 'triangle':
        drawPolygon(3);
        break;

      case 'pentagon':
        drawPolygon(5);
        break;

      case 'hexagon':
        drawPolygon(6);
        break;

      case 'octagon':
        drawPolygon(8);
        break;

      case 'star': {
        const spikes = 5;
        const outerRadius = r;
        const innerRadius = r * 0.5;
        let rot = -Math.PI / 2;
        ctx.beginPath();
        for (let i = 0; i < spikes; i++) {
          const xOuter = cx + Math.cos(rot) * outerRadius;
          const yOuter = cy + Math.sin(rot) * outerRadius;
          ctx.lineTo(xOuter, yOuter);
          rot += Math.PI / spikes;
          const xInner = cx + Math.cos(rot) * innerRadius;
          const yInner = cy + Math.sin(rot) * innerRadius;
          ctx.lineTo(xInner, yInner);
          rot += Math.PI / spikes;
        }
        ctx.closePath();
        fill ? ctx.fill() : ctx.stroke();
        break;
      }

      case 'cross': {
        const arm = r * 1;
        const t = r * 0.35;
        ctx.beginPath();
        ctx.moveTo(cx - t, cy - arm);
        ctx.lineTo(cx + t, cy - arm);
        ctx.lineTo(cx + t, cy - t);
        ctx.lineTo(cx + arm, cy - t);
        ctx.lineTo(cx + arm, cy + t);
        ctx.lineTo(cx + t, cy + t);
        ctx.lineTo(cx + t, cy + arm);
        ctx.lineTo(cx - t, cy + arm);
        ctx.lineTo(cx - t, cy + t);
        ctx.lineTo(cx - arm, cy + t);
        ctx.lineTo(cx - arm, cy - t);
        ctx.lineTo(cx - t, cy - t);
        ctx.closePath();
        fill ? ctx.fill() : ctx.stroke();
        break;
      }

      default:
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        fill ? ctx.fill() : ctx.stroke();
        break;
    }
}







  // === COORDINATE CONVERSION FUNCTIONS ===
  function worldToScreen(wx, wy){
    const cx = canvas.clientWidth/2;
    const cy = canvas.clientHeight/2;
    return { x: cx + (wx - camera.x) * baseGridPx * scale, y: cy - (wy - camera.y) * baseGridPx * scale };
  }
  export function screenToWorld(sx, sy){
    const cx = canvas.clientWidth/2;
    const cy = canvas.clientHeight/2;
    return { x: camera.x + (sx - cx) / (baseGridPx * scale), y: camera.y - (sy - cy) / (baseGridPx * scale) };
  }







// Helper: convert hex color (#RRGGBB) to {r,g,b}
function hexToRgb(hex) {
  console.log(canvas.width)
  hex = hex.replace("#", "");
  if (hex.length === 3) { // shorthand #f00
    hex = hex.split("").map(c => c + c).join("");
  }
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

// Main shadow function
function drawUniformBorderShadow(ctx, color = "#000000", strength = 0.3, sizeCss = 30) {
  const dpr = window.devicePixelRatio || 1;
  const { r, g, b } = hexToRgb(color);

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); // unscaled coords

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const size = Math.max(1, Math.round(sizeCss * dpr));

  // TOP
  let gTop = ctx.createLinearGradient(0, 0, 0, size);
  gTop.addColorStop(0, `rgba(${r},${g},${b},${strength})`);
  gTop.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = gTop;
  ctx.fillRect(0, 0, w, size);

  // BOTTOM
  let gBottom = ctx.createLinearGradient(0, h - size, 0, h);
  gBottom.addColorStop(0, `rgba(${r},${g},${b},0)`);
  gBottom.addColorStop(1, `rgba(${r},${g},${b},${strength})`);
  ctx.fillStyle = gBottom;
  ctx.fillRect(0, h - size, w, size);

  // LEFT
  let gLeft = ctx.createLinearGradient(0, 0, size, 0);
  gLeft.addColorStop(0, `rgba(${r},${g},${b},${strength})`);
  gLeft.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = gLeft;
  ctx.fillRect(0, 0, size, h);

  // RIGHT
  let gRight = ctx.createLinearGradient(w - size, 0, w, 0);
  gRight.addColorStop(0, `rgba(${r},${g},${b},0)`);
  gRight.addColorStop(1, `rgba(${r},${g},${b},${strength})`);
  ctx.fillStyle = gRight;
  ctx.fillRect(w - size, 0, size, h);

  ctx.restore();
}
