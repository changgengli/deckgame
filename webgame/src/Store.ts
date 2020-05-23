import reduxWebsocket, { send } from "@giantmachines/redux-websocket";

import { configureStore } from "@reduxjs/toolkit";
import thunk from "redux-thunk";
import { ConnectionStatus } from "./Types";

interface HallState {
  players: string[];
  game_ids: number[];
  games: {
    players: Array<string | undefined>;
    id: number;
  }[];
}
interface GameState {
  players: Array<string | undefined>;
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
  console.log(action);
  switch (data.type) {
    case "LoginSuccess":
      return { ...state, myId: data.id, login: {} };

    case "Hall":
      let hall = { ...data };
      return {
        ...state,
        hall,
      };
  }
  return state;
};

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
  console.log("root reducer", action);
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
