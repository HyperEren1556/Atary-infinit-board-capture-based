
export let playerCount = 2; // configurable later if desired (max 4)

// === PLAYER SETTINGS ===
class Player {
  constructor(id, color, shape, score) { this.id = id; this.color = color; this.shape = shape; this.score = score }
}
// By default the game uses 2 players (but definitions for up to 4 exist)
//let playerCount = 2; // configurable later if desired (max 4)
export const players = []
const defaultPlayers = {
  1: { color: '#ff0000', shape: 'circle', score: 0 },
  2: { color: '#3b82f6', shape: 'square', score: 0 },
  3: { color: '#00ff00', shape: 'triangle', score: 0 },
  4: { color: '#7f00ff', shape: 'pentagon', score: 0 }
};
export function loadPlayers() {
  for (let i = 1; i <= playerCount; i++) players.push(new Player(i, defaultPlayers[i].color, defaultPlayers[i].shape, defaultPlayers[i].score));
};