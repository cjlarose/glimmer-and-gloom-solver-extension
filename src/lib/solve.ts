import { Level, TileState } from "./level";
import { Coord, getAllNeighbors } from "./coords";

export function generateAugmentedMatrix(
  level: Level,
  desiredState: TileState,
): number[][] {
  // Create a mapping of coordinates to indices in the matrix
  const coordToIndex: Map<string, number> = new Map();
  let index = 0;
  for (const tile of level.tiles) {
    coordToIndex.set(`${tile.row},${tile.column}`, index++);
  }

  const matrix: number[][] = [];

  for (const tile of level.tiles) {
    const row: number[] = new Array(level.tiles.length).fill(0);
    const neighbors = getAllNeighbors(
      { row: tile.row, column: tile.column },
      level,
    );

    // Set the coefficient for the current tile
    const tileIndex = coordToIndex.get(`${tile.row},${tile.column}`);
    if (tileIndex !== undefined) {
      row[tileIndex] = 1;
    }

    // Add coefficients for neighbors
    for (const neighbor of neighbors) {
      const neighborIndex = coordToIndex.get(
        `${neighbor.row},${neighbor.column}`,
      );
      if (neighborIndex !== undefined) {
        row[neighborIndex] = 1;
      }
    }

    // Determine the right-hand side of the congruence
    const targetModulus = desiredState === tile.status ? 0 : 1;

    // Append the row to the matrix with the augmented value
    matrix.push([...row, targetModulus]);
  }

  return matrix;
}

export function solveMod2Matrix(augmentedMatrix: number[][]): number[][] {
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
      [augmentedMatrix[row], augmentedMatrix[pivotRow]] = [
        augmentedMatrix[pivotRow],
        augmentedMatrix[row],
      ];
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

export function getSolutionCoordinates(
  level: Level,
  solutions: number[][],
): Coord[][] {
  // Create a mapping of indices to coordinates
  const coordToIndex: Map<number, Coord> = new Map();
  let index = 0;
  for (const tile of level.tiles) {
    coordToIndex.set(index++, { row: tile.row, column: tile.column });
  }

  // Map each solution vector to coordinates
  return solutions.map((solutionVector) => {
    return solutionVector
      .map((value, idx) => {
        if (value === 1) {
          return coordToIndex.get(idx);
        }
      })
      .filter((coord) => coord !== undefined) as Coord[];
  });
}
