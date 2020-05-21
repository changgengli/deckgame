export type Message = ChatMessage | PlayerJoinGame | PlayerLogin;

export interface ChatMessage {
  kind: "ChatMessage";
  player: string;
  message: string;
}
export interface PlayerJoinGame {
  kind: "PlayerJoinGame";
  gameId: number;
  player: string;
  position: number;
}

export interface PlayerLogin {
  kind: "PlayerLogin";
  player: string;
}
