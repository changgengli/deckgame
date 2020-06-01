import React, { Component, useEffect } from "react";
import { Hall } from "./Hall";
import { Provider } from "react-redux";
import { store, State } from "./Store";
import { connect, send } from "@giantmachines/redux-websocket/dist";
import Connection from "./components/Connection";
import CurrentUser from "./components/CurrentUser";
import LoginWindow from "./components/LoginWindow";
import { connect as redux_connect } from "react-redux";
import GameRoom from "./components/GameRoom";
// import "./App.scss";

import { ConnectionStatus } from "./Types";
import ErrorWindow from "./components/ErrorWindow";
interface GameState {
  selected_card_pile: string;
  selected_cards: number[]; //index
  trump_color: number | undefined; //
  trump_number: number; // 1 - 13 or joker 0
}
interface Game {
  players: string[];
  piles: Map<string, number[]>;
  players_ready: boolean[];
}

interface Hall {
  games: Map<number, Game>;
}

interface GameProps {
  myId?: string | undefined;
  inGame: boolean;
  connection: ConnectionStatus;
  ping: () => void;
}

const Root: React.FunctionComponent<GameProps> = (props) => {
  useEffect(() => {
    let interval = setInterval(() => {
      props.ping();
    }, 15000);
    return () => {
      clearInterval(interval);
    };
  });

  console.log(props);
  return (
    <>
      {props.connection === "connected" ? null : (
        <div className="connection-banner">Connecting to game server ...</div>
      )}

      <ErrorWindow />
      <div
        style={{
          filter:
            props.connection === "connected"
              ? "none"
              : "grayscale(80%) blur(1px)",
        }}
      >
        <div id="head">
          <Connection />

          {props.myId ? <CurrentUser /> : <LoginWindow />}
        </div>
        {props.inGame ? <GameRoom /> : props.myId ? <Hall /> : null}
      </div>
    </>
  );
};

const RootContainer = redux_connect(
  (
    state: State
  ): {
    myId?: string | undefined;
    inGame: boolean;
    connection: ConnectionStatus;
  } => {
    return {
      connection: state.connection,
      myId: state.myId,
      inGame: state.game?.id !== null && state.game?.id !== undefined,
    };
  },
  (dispatch) => {
    return {
      ping: () => {
        dispatch(send({ type: "Ping" }));
      },
    };
  }
)(Root);

export const RootComponent: React.FunctionComponent<{}> = (props) => {
  var url = new URL("/websocket", window.location.href);

  url.protocol = url.protocol.replace("http", "ws");

  useEffect(() => {
    store.dispatch(connect(url.href));
  });
  return (
    <Provider store={store}>
      <RootContainer />
    </Provider>
  );
};
