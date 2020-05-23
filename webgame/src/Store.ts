import reduxWebsocket, { send } from "@giantmachines/redux-websocket";

import { configureStore } from "@reduxjs/toolkit";
import thunk from "redux-thunk";
import { ConnectionStatus, GameInHall } from "./Types";

interface HallState {
  players: string[];
  games: Record<number, GameInHall>;
  currentGame?: { id: number; position: number } | undefined;
}
interface GameState {
  position: number;
  // piles: {
  //   pile: string;
  //   cards: number[] | undefined;
  //   total_cards: number;
  // };
  id: number;
}

export interface State {
  connection: ConnectionStatus;
  myId?: string | undefined;
  hall: HallState;
  // game: GameState | undefined;
  login?: {
    errorMessage?: string | undefined;
  };
}

const connectionReducer = (
  state: ConnectionStatus = "disconnected",
  action: any
): ConnectionStatus => {
  console.log("ACTION " + JSON.stringify(action));
  switch (action.type) {
    case "REDUX_WEBSOCKET::OPEN":
      return "connected";
    case "REDUX_WEBSOCKET::CONNECT":
      return "connecting";
    case "REDUX_WEBSOCKET::BROKEN":
    case "REDUX_WEBSOCKET::CLOSED":
      return "disconnected";
    default:
      return state;
  }
};
const message = (state: State, action: any): State => {
  // messages: [
  //   ...state.messages,
  //   {
  //     data: JSON.parse(action.payload.message),
  //     origin: action.payload.origin,
  //     timestamp: action.meta.timestamp,
  //     type: "INCOMING",
  //   },
  // ],

  let data = JSON.parse(action.payload.message);
  console.log("message", data);
  switch (data.type) {
    case "LoginSuccess":
      return { ...state, myId: data.id, login: {} };

    case "Hall":
      let hall = {
        players: data.players,
        games: Object.fromEntries(data.games.map((x: GameInHall) => [x.id, x])),
      };

      return {
        ...state,
        hall,
      };
    case "GameInHall":
      let game = data as GameInHall;
      let games;
      if (game.players.filter((x) => x).length === 0) {
        games = { ...state.hall.games };
        delete games[game.id];
      } else {
        games = { ...state.hall.games, [game.id]: game };
      }
      return {
        ...state,
        hall: {
          ...state.hall,
          games: games,
        },
      };
    case "PlayerJoinedGame":
      if (data.player === state.myId) {
        return {
          ...state,
          hall: {
            ...state.hall,
            currentGame: {
              id: data.game_id,
              position: data.position,
            },
          },
        };
      }
    case "PlayerLeftGame": {
      if (data.player === state.myId) {
        return {
          ...state,
          hall: {
            ...state.hall,
            currentGame: undefined,
          },
        };
      }
    }
  }
  return state;
};

const rootReducer = (
  state: State = {
    connection: "disconnected",
    hall: {
      players: [],
      games: {},
    },
    myId: "",
  },
  action: any
): State => {
  console.log("root reducer", action);
  let myId;
  switch (action.type) {
    case "REDUX_WEBSOCKET::BROKEN":
    case "REDUX_WEBSOCKET::CLOSED":
      myId = undefined;
      return {
        ...state,
        connection: connectionReducer(state.connection, action),
        myId,
      };
    case "REDUX_WEBSOCKET::OPEN":
    case "REDUX_WEBSOCKET::CONNECT":
      return {
        ...state,
        connection: connectionReducer(state.connection, action),
      };

    case "REDUX_WEBSOCKET::MESSAGE":
      return {
        ...message(state, action),
      };
    default:
      return state;
  }
};
export const store = configureStore({
  reducer: rootReducer,
  middleware: [thunk, reduxWebsocket()],
});

let myId: string | undefined = undefined;
store.subscribe(() => {
  //load hall after login
  if (myId !== store.getState().myId) {
    myId = store.getState().myId;
    store.dispatch(send({ type: "Hall" }));
  }
});
export type AppDispatch = typeof store.dispatch;
