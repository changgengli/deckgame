import React, { Component, useEffect } from "react";
import { Hall } from "./Hall";
import { Provider } from "react-redux";
import { store, State } from "./Store";
import { connect } from "@giantmachines/redux-websocket/dist";
import Connection from "./components/Connection";
import CurrentUser from "./components/CurrentUser";
import LoginWindow from "./components/LoginWindow";
import { connect as redux_connect } from "react-redux";
import GameRoom from "./components/GameRoom";
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
}

class Root extends Component<GameProps> {
  render() {
    return (
      <div>
        <div id="head">
          <Connection />
          {this.props.myId ? <CurrentUser /> : <LoginWindow />}
        </div>
        {this.props.inGame ? <GameRoom /> : this.props.myId ? <Hall /> : null}
        {/* <Hand
          trumpColor={undefined}
          trumpNumber={undefined}
          cards={Array.from(Array(54).keys())}
          highlights={
            new Map([
              [0, true],
              [9, true],
            ])
          }
          onCardClick={(n) => console.log("selected " + n)}
        /> */}
      </div>
    );
  }
}

const RootContainer = redux_connect(
  (state: State): GameProps => {
    return {
      myId: state.myId,
      inGame: state.game?.id !== null && state.game?.id !== undefined,
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
