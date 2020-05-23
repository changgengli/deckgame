import { Message } from "./Message";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export interface GameInHall {
  id: number;
  players: Array<string | undefined>;
}

export interface CreateGameRequest {
  total_decks: number;
  total_players: number;
  cards_to_reserve: number;
}
export interface CreateGameProps {
  createGame: (game: CreateGameRequest) => void;
}
export interface JoinGameRequest {
  id: number;
  position: number;
}
export interface HallProps {
  games: GameInHall[];
  messages: Message[];
  myId: string | undefined;
  createGame: CreateGameProps["createGame"];
  joinGame: (request: JoinGameRequest) => void;
  //TODO action handler
}
