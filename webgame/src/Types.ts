import { Message } from "./Message";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export interface GameInHall {
  gameId: number;
  players: Array<string | undefined>;
  totalPlayers: number;
  full: boolean;
}

export interface HallProps {
  games: GameInHall[];
  messages: Message[];
  myId: string;
  //TODO action handler
}
