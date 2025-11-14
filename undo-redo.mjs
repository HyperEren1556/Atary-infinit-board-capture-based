//import { detectCapture } from "../detectCapture.mjs"
import { deadspace } from "./detectCapture.mjs";;
import { playerCount } from "./player.mjs";
import { detectCapture } from "./detectCapture.mjs";





const undoStack = []; // history of moves for undo
const redoStack = []; // history of undone moves for redo
export let nextPlayer = 1; // 1 or 2, determines next turn
export let currentPlayer = 0;
let counter = 0; // increases each time a point is placed (or when a captured-shape is saved as one move)




// === GAME LOGIC: PLACE, UNDO, REDO ===
export function placeAt(world, placedBalls, deadspace, players) {

  const sx = Math.round(world.x);
  const sy = Math.round(world.y);


  if (checkOccupied(placedBalls, deadspace, sx, sy)) return;
  //set point onn board
  const ball = { x: sx, y: sy, player: currentPlayer, color: players[currentPlayer].color, shape: players[currentPlayer].shape, alive: true };
  placedBalls.push(ball);
  const captures = detectCapture(placedBalls, players);
  // Save move to undo history
  undoStack.push({ type: 'add', ball }); redoStack.length = 0;


  nextTurn()
  updateCurrentPlayer()

}


export function checkOccupied(placedBalls, deadSpace, ux, uy) {
  // Prevent placing on occupied grid and deadSpace point
  if (
    placedBalls.some(b => b.x === ux && b.y === uy) ||
    deadspace.some(d => d[0] === ux && d[1] === uy)
  ) return true;
}



export function updateCurrentPlayer() {
  currentPlayer = currentPlayerIndex();
  nextPlayer = currentPlayerIndex(1);
}



export function nextTurn() {
  counter++
}



export function previousTurn() {
  counter--
}



export function currentPlayerIndex(extra = 0) { return ((counter + extra) % playerCount); } // 0-based index into players array



export function undo(placedBalls) {
  if (undoStack.length === 0) return;
  const action = undoStack.pop();
  if (action.type === 'add') {
    for (let i = placedBalls.length - 1; i >= 0; i--) {
      const b = placedBalls[i];
      if (b.x === action.ball.x && b.y === action.ball.y && b.player === action.ball.player) {
        placedBalls.splice(i, 1);
        redoStack.push(action);
        previousTurn()
        updateCurrentPlayer()
        break;
      }
    }
  }
  return placedBalls
}



export function redo(placedBalls) {
  if (redoStack.length === 0) return;
  const action = redoStack.pop();
  if (action.type === 'add') {
    placedBalls.push(action.ball);
    undoStack.push(action);
    nextTurn()
    updateCurrentPlayer()
  }
  return placedBalls
}















