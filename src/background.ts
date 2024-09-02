const ENGINE_IO_PACKET_TYPE_MESSAGE = 4;
const SOCKET_IO_PACkET_TYPE_EVENT = 2;
const SOCKET_IO_PACkET_TYPE_ACK = 3;
const GG_EVENT_GENERATE_LEVEL = "generateLevel";

enum TileState {
  DARK,
  LIGHT
}

interface Tile {
  row: number;
  column: number;
  status: TileState;
}

interface Level {
  rows: number;
  columns: number;
  tiles: Tile[];
}

interface ConnectionInit {
  type: "INIT";
}

interface WaitingForLevelData {
  type: "WAITING_FOR_LEVEL_DATA";
  ackId: number;
}

interface ReceivedLevelData {
  type: "RECEIVED_LEVEL_DATA";
  level: Level;
}

type ConnectionState = ConnectionInit | WaitingForLevelData | ReceivedLevelData;

const initialState: ConnectionState = { type: "INIT" };

interface TileData {
  row: number;
  column: number;
  status: 0 | 1;
}

interface LevelData {
  rows: number;
  columns: number;
  tiles: TileData[];
}

function parseLevel(levelData: LevelData): Level {
  const tiles: Tile[] = levelData.tiles.map((tile: TileData) => ({
    row: tile.row,
    column: tile.column,
    status: tile.status === 1 ? TileState.LIGHT : TileState.DARK
  }));

  return {
    rows: levelData.rows,
    columns: levelData.columns,
    tiles
  };
}

function handlePacket(state: ConnectionState = initialState, packet: String): ConnectionState {
  const engineIOPacket = packet;
  const engineIOPacketType = parseInt(engineIOPacket.charAt(0), 10);
  if (engineIOPacketType != ENGINE_IO_PACKET_TYPE_MESSAGE) {
    return state;
  }

  const socketIOPacketType = parseInt(engineIOPacket.charAt(1), 10);

  // Extract the acknowledgement ID (all digits after the socketIOPacketType)
  const ackIdDigits = [];
  let index = 2; // Start after the socketIOPacketType
  while (index < engineIOPacket.length && /\d/.test(engineIOPacket.charAt(index))) {
    ackIdDigits.push(engineIOPacket.charAt(index));
    index++;
  }

  // Parse the ackId as a number
  const ackId = ackIdDigits.length > 0 ? parseInt(ackIdDigits.join(''), 10) : null;

  // Extract the JSON-encoded payload (everything after the ackId)
  const payload = JSON.parse(engineIOPacket.slice(index));


  // state init
  //   if sending event (generate level) => state waiting for level data
  // state waiting for level data
  //   if receiving ack => state received level data
  // state received data
  //   if sending event (generate level) => state waiting for level data

  switch (state.type) {
    case "INIT":
      if (socketIOPacketType == SOCKET_IO_PACkET_TYPE_EVENT &&
          Array.isArray(payload) &&
          payload[0] === GG_EVENT_GENERATE_LEVEL &&
          ackId !== null) {
        return {
          type: "WAITING_FOR_LEVEL_DATA",
          ackId
        };
      }
      return state;
    case "WAITING_FOR_LEVEL_DATA":
      if (socketIOPacketType == SOCKET_IO_PACkET_TYPE_ACK &&
          ackId === state.ackId &&
          Array.isArray(payload)) {
        const level = parseLevel(payload[0]);
        console.log({ level });

        const solutionCoords = [TileState.DARK, TileState.LIGHT].flatMap(desiredState => {
            const augmentedMatrix = generateAugmentedMatrix(level, desiredState);
            console.log({ augmentedMatrix });
            const solutions = solveMod2Matrix(augmentedMatrix);
            console.log({ solutions });
            return getSolutionCoordinates(level, solutions);
        });

        console.log({ solutionCoords });

        const minimalSolution = solutionCoords.reduce((minSolution, currentSolution) => {
            return currentSolution.length < minSolution.length ? currentSolution : minSolution;
        }, solutionCoords[0]);

        console.log({ minimalSolution });

        return {
          type: "RECEIVED_LEVEL_DATA",
          level,
        };
      }
      return state;
    case "RECEIVED_LEVEL_DATA":
      if (socketIOPacketType == SOCKET_IO_PACkET_TYPE_EVENT &&
          Array.isArray(payload) &&
          payload[0] === GG_EVENT_GENERATE_LEVEL &&
          ackId !== null) {
        return {
          type: "WAITING_FOR_LEVEL_DATA",
          ackId
        };
      }
      return state;
    default:
      return state;
  }
};

// https://www.redblobgames.com/grids/hexagons/#coordinates-offset
const DIRECTION_DIFFERENCES = [
    // even rows
    [[+1,  0], [+1, -1], [ 0, -1],
     [-1,  0], [ 0, +1], [+1, +1]],
    // odd rows
    [[+1,  0], [ 0, -1], [-1, -1],
     [-1,  0], [-1, +1], [ 0, +1]],
];

enum DIRECTION {
  EAST,
  NORTHEAST,
  NORTHWEST,
  WEST,
  SOUTHWEST,
  SOUTHEAST,
}

interface Coord {
  row: number;
  column: number;
}

function getOffsetNeighbor(coord: Coord, direction: DIRECTION) {
  const parity = coord.row & 1;
  const [columnDiff, rowDiff] = DIRECTION_DIFFERENCES[parity][direction];
  return {
    row: coord.row + rowDiff,
    column: coord.column + columnDiff,
  };
}

interface GridDimensions {
  rows: number;
  columns: number;
}

function getAllNeighbors(coord: Coord, level: GridDimensions): Coord[] {
  const neighbors: Coord[] = [];

  for (let direction in DIRECTION) {
    if (isNaN(Number(direction))) continue; // Skip non-numeric values (TypeScript enum issue)

    const neighbor = getOffsetNeighbor(coord, Number(direction));

    // Check if the neighbor is within the bounds of the level grid (1-indexed)
    if (
      neighbor.row >= 1 && neighbor.row <= level.rows &&
      neighbor.column >= 1 && neighbor.column <= level.columns
    ) {
      neighbors.push(neighbor);
    }
  }

  return neighbors;
}

function generateAugmentedMatrix(level: Level, desiredState: TileState): number[][] {
  // Create a mapping of coordinates to indices in the matrix
  const coordToIndex: Map<string, number> = new Map();
  let index = 0;
  for (const tile of level.tiles) {
    coordToIndex.set(`${tile.row},${tile.column}`, index++);
  }

  const matrix: number[][] = [];

  for (const tile of level.tiles) {
    const row: number[] = new Array(level.tiles.length).fill(0);
    const neighbors = getAllNeighbors({ row: tile.row, column: tile.column }, level);

    // Set the coefficient for the current tile
    const tileIndex = coordToIndex.get(`${tile.row},${tile.column}`)
    if (tileIndex !== undefined) {
      row[tileIndex] = 1;
    }

    // Add coefficients for neighbors
    for (const neighbor of neighbors) {
      const neighborIndex = coordToIndex.get(`${neighbor.row},${neighbor.column}`);
      if (neighborIndex !== undefined) {
        row[neighborIndex] = 1;
      }
    }

    // Determine the right-hand side of the congruence
    const targetModulus = (desiredState === tile.status) ? 0 : 1;

    // Append the row to the matrix with the augmented value
    matrix.push([...row, targetModulus]);
  }

  return matrix;
}

function solveMod2Matrix(augmentedMatrix: number[][]): number[][] {
  const numRows = augmentedMatrix.length;
  const numCols = augmentedMatrix[0].length - 1; // Last column is for the constants

  // Gaussian elimination to row echelon form
  let row = 0;
  for (let col = 0; col < numCols; col++) {
    // Find a pivot row
    let pivotRow = -1;
    for (let r = row; r < numRows; r++) {
      if (augmentedMatrix[r][col] === 1) {
        pivotRow = r;
        break;
      }
    }

    if (pivotRow === -1) {
      // No pivot in this column; continue to next column
      continue;
    }

    // Swap current row with pivot row
    if (pivotRow !== row) {
      [augmentedMatrix[row], augmentedMatrix[pivotRow]] = [augmentedMatrix[pivotRow], augmentedMatrix[row]];
    }

    // Eliminate all other 1s in this column
    for (let r = 0; r < numRows; r++) {
      if (r !== row && augmentedMatrix[r][col] === 1) {
        for (let j = col; j < augmentedMatrix[r].length; j++) {
          augmentedMatrix[r][j] ^= augmentedMatrix[row][j];
        }
      }
    }

    row++;
  }

  // Identify pivot positions and free variables
  const pivotPositions = new Array(numCols).fill(-1);
  const freeVars = new Array(numCols).fill(true);
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      if (augmentedMatrix[r][c] === 1) {
        pivotPositions[c] = r;
        freeVars[c] = false;
        break;
      }
    }
  }

  // Generate all possible combinations for the free variables
  const generateCombinations = (combination: number[], pos: number) => {
    if (pos === numCols) {
      // Construct a solution vector
      const solutionVector = new Array(numCols).fill(0);
      // Set values for basic variables
      for (let i = 0; i < numCols; i++) {
        if (pivotPositions[i] !== -1) {
          // Compute value for pivot variables
          let sum = 0;
          for (let j = 0; j < numCols; j++) {
            if (augmentedMatrix[pivotPositions[i]][j] === 1) {
              sum ^= combination[j];
            }
          }
          solutionVector[i] = sum ^ augmentedMatrix[pivotPositions[i]][numCols];
        } else {
          // For free variables, use the provided combination
          solutionVector[i] = combination[i];
        }
      }
      solutions.push(solutionVector);
      return;
    }

    // Iterate over possible values (0 and 1) for the current variable
    if (freeVars[pos]) {
      for (let value of [0, 1]) {
        combination[pos] = value;
        generateCombinations(combination, pos + 1);
      }
    } else {
      // Fixed value for non-free variables (do not change)
      combination[pos] = 0;
      generateCombinations(combination, pos + 1);
    }
  };

  // Start with an empty combination array
  const solutions: number[][] = [];
  generateCombinations(new Array(numCols).fill(0), 0);

  return solutions;
}

function getSolutionCoordinates(level: Level, solutions: number[][]): Coord[][] {
  // Create a mapping of indices to coordinates
  const coordToIndex: Map<number, Coord> = new Map();
  let index = 0;
  for (const tile of level.tiles) {
    coordToIndex.set(index++, { row: tile.row, column: tile.column });
  }

  // Map each solution vector to coordinates
  return solutions.map((solutionVector) => {
    return solutionVector.map((value, idx) => {
      if (value === 1) {
        return coordToIndex.get(idx);
      }
    }).filter(coord => coord !== undefined) as Coord[];
  });
}

let connectionState: ConnectionState = initialState;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  connectionState = handlePacket(connectionState, message.data);
  sendResponse({ reply: "Thanks" });

  return true;
});
