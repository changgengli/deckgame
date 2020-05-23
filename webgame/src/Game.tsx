import React, { Component, useEffect } from "react";
import { Hand } from "./Pile";
import { Hall } from "./Hall";
import { Provider } from "react-redux";
import { store, State } from "./Store";
import { connect } from "@giantmachines/redux-websocket/dist";
import Connection from "./components/Connection";
import CurrentUser from "./components/CurrentUser";
import LoginWindow from "./components/LoginWindow";
import { connect as redux_connect } from "react-redux";
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
}

class Root extends Component<GameProps> {
  render() {
    return (
      <div>
        <div id="head">
          <CurrentUser />
          <Connection />
        </div>
        {this.props.myId ? null : <LoginWindow />}
        <Hall />
        <Hand
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
        />
        ;
      </div>
    );
  }
}

const RootContainer = redux_connect(
  (state: State): GameProps => {
    return {
      myId: state.myId,
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
