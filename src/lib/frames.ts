import { EngineIOPacketType } from "./engine_io";
import { SocketIOPacketType } from "./socket_io";

export interface Upgrade {
  engineIOPacketType: EngineIOPacketType.UPGRADE;
}

export interface Message {
  engineIOPacketType: EngineIOPacketType.MESSAGE;
  socketIOPacketType: SocketIOPacketType;
  ackId?: number;
  payload: any;
}
