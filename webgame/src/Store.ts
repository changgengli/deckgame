import reduxWebsocket from "@giantmachines/redux-websocket";

import { GameAction } from "./Actions";
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import thunk from "redux-thunk";
import { disconnect } from "cluster";
import { act } from "react-dom/test-utils";
import { ConnectionStatus } from "./Types";
import { stat } from "fs";

interface HallState {
  players: string[];
  game_ids: number[];
  games: {
    players: Array<String | undefined>;
    id: number;
  }[];
}
interface GameState {
  players: Array<String | undefined>;
  position: number;
  piles: {
    pile: string;
    cards: number[] | undefined;
    total_cards: number;
  };
}

export interface State {
  connection: ConnectionStatus;
  myId?: string | undefined;
  hall: HallState;
  game: GameState | undefined;
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

// export const getConnected = (state: State) => state.connected;
// const intialState: State = { connection: "disconnected" };

const message = (state: State, action: any): State => {
  // ...state,
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
  console.log(action);
  return state;
};

// export interface State {
//   connection: ConnectionStatus;
// }

const rootReducer = (
  state: State = {
    connection: "disconnected",
    hall: {
      players: [],
      game_ids: [],
      games: [],
    },
    game: undefined,
    myId: "",
  },
  action: any
): State => {
  switch (action.type) {
    case "REDUX_WEBSOCKET::OPEN":
    case "REDUX_WEBSOCKET::CONNECT":
    case "REDUX_WEBSOCKET::BROKEN":
    case "REDUX_WEBSOCKET::CLOSED":
      let connection = connectionReducer(state.connection, action);
      return {
        ...state,
        connection,
      };
    case "REDUX_WEBSOCKET::REDUX_WEBSOCKET_MESSAGE":
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
export type AppDispatch = typeof store.dispatch;
