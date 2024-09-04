import { SocketIOPacketType } from './lib/socket_io';
import { ConnectionState, LevelDifficulty } from './lib/connection';
import { Level } from './lib/level';
import { Coord } from './lib/coords';

const ENGINE_IO_PACKET_TYPE_MESSAGE = 4;

function clearOverlay() {
    const existingOverlay = document.querySelector<HTMLElement>(".solution-overlay");
    if (existingOverlay) {
        existingOverlay.remove();
    }
}

function symmetricDifference<T>(setA: Set<T>, setB: Set<T>): Set<T> {
    const difference = new Set(setA);
    for (const elem of setB) {
        if (difference.has(elem)) {
            difference.delete(elem);
        } else {
            difference.add(elem);
        }
    }
    return difference;
}

function applySolutionOverlay(difficulty: LevelDifficulty, level: Level, solution: Coord[], clickedCoords: Coord[]) {
    const tileSet = new Set(level.tiles.map(({ row, column }) => `${row},${column}`));
    const solutionSet = new Set(solution.map(({ row, column }) => `${row},${column}`));
    const clickedSet = new Set(clickedCoords.map(({ row, column }) => `${row},${column}`));
    const remainingToClick = symmetricDifference(solutionSet, clickedSet);

    const frame = document.querySelector<HTMLElement>("#glimmer-gloom-frame");
    if (!frame) {
        return;
    }

    frame.style.position = "relative";

    const overlay = document.createDocumentFragment();
    const overlayRows = document.createElement("div");
    overlayRows.classList.add("solution-overlay");

    overlayRows.style.pointerEvents = "none";
    overlayRows.style.position = "absolute";
    overlayRows.style.display = "grid";
    overlayRows.style.gridAutoRows = "1fr";

    // medium settings
    switch (difficulty) {
        case LevelDifficulty.EASY:
            overlayRows.style.width = "470px";
            overlayRows.style.height = "240px";
            overlayRows.style.left = "115px";
            overlayRows.style.top = "193px";
            break;
        case LevelDifficulty.MEDIUM:
            overlayRows.style.width = "470px";
            overlayRows.style.height = "475px";
            overlayRows.style.left = "115px";
            overlayRows.style.top = "75px";
            break;
        case LevelDifficulty.HARD:
            overlayRows.style.width = "470px";
            overlayRows.style.height = "361px";
            overlayRows.style.left = "115px";
            overlayRows.style.top = "128px";
            break;
        case LevelDifficulty.VERY_HARD:
            overlayRows.style.width = "478px";
            overlayRows.style.height = "412px";
            overlayRows.style.left = "111px";
            overlayRows.style.top = "102px";
            break;
    }

    let evenRowOffset = 0;
    switch (difficulty) {
        case LevelDifficulty.EASY:
            evenRowOffset = 47;
            break;
        case LevelDifficulty.MEDIUM:
            evenRowOffset = 39;
            break;
        case LevelDifficulty.HARD:
            evenRowOffset = 29;
            break;
        case LevelDifficulty.VERY_HARD:
            evenRowOffset = 26.5;
            break;
    }

    for (let row = 1; row <= level.rows; row++) {
        const rowDiv = document.createElement("div");
        rowDiv.dataset.row = row.toString();

        rowDiv.style.display = "grid";
        rowDiv.style.gridTemplateColumns = `repeat(${level.columns}, minmax(0, 1fr))`;

        if (row % 2 == 0) {
            rowDiv.style.position = "relative";
            rowDiv.style.left = `${evenRowOffset}px`;
        }

        for (let column = 1; column <= level.columns; column++) {
            const colDiv = document.createElement("div");
            colDiv.dataset.column = column.toString();

            if (remainingToClick.has(`${row},${column}`)) {
                colDiv.dataset.solution = "true";
                colDiv.style.display = "flex";
                colDiv.style.flexDirection = "column";
                colDiv.style.justifyContent = "center";

                const span = document.createElement("span");
                span.textContent = "🔘";
                colDiv.appendChild(span);
            }

            if (!tileSet.has(`${row},${column}`)) {
                colDiv.dataset.placeholder = "true";
            }

            rowDiv.appendChild(colDiv);
        }

        overlayRows.appendChild(rowDiv);
    }
    overlay.appendChild(overlayRows);

    frame.appendChild(overlay);
}

function handleConnectionState(connectionState: ConnectionState) {
  clearOverlay();
  switch (connectionState.type) {
    case "COMPUTED_SOLUTION": {
      const { difficulty, level, minimalSolution, clickedCoords } = connectionState;
      applySolutionOverlay(difficulty, level, minimalSolution, clickedCoords);
      break;
    }
  }
}

window.addEventListener("message", function(event) {
  // Only accept messages from the same window
  if (event.source !== window) return;

  // Check if the message is intended for the extension
  if (event.data === undefined) {
      return;
  }

  const engineIOPacket = event.data.data;
  const engineIOPacketType = parseInt(engineIOPacket.charAt(0), 10);
  if (engineIOPacketType != ENGINE_IO_PACKET_TYPE_MESSAGE) {
      return;
  }

  const socketIOPacketType = parseInt(engineIOPacket.charAt(1), 10);

  if (socketIOPacketType != SocketIOPacketType.EVENT && socketIOPacketType != SocketIOPacketType.ACK) {
      return;
  }

  // Extract the acknowledgement ID (all digits after the socketIOPacketType)
  const ackIdDigits: string[] = [];
  let index = 2; // Start after the socketIOPacketType
  while (index < engineIOPacket.length && /\d/.test(engineIOPacket.charAt(index))) {
      ackIdDigits.push(engineIOPacket.charAt(index));
      index++;
  }

  // Parse the ackId as a number
  const ackId = ackIdDigits.length > 0 ? parseInt(ackIdDigits.join(''), 10) : null;

  // Extract the JSON-encoded payload (everything after the ackId)
  const payload = JSON.parse(engineIOPacket.slice(index));

  const message = { socketIOPacketType, ackId, payload };
  chrome.runtime.sendMessage(message, function(response: ConnectionState) {
      console.log("(received) Content script got response from service worker");
      console.log({ response });

      handleConnectionState(response);
  });
});
