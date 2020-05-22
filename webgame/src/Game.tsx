import React, { Component, useEffect } from "react";
import { useDrag } from "react-dnd";
import { Card } from "./Card";
import { Hand } from "./Pile";
import { Hall } from "./Hall";
import { PlayerLogin, Message, PlayerJoinGame } from "./Message";
import { Provider } from "react-redux";
import { store } from "./Store";
import { connect } from "@giantmachines/redux-websocket/dist";
import Connection from "./components/Connection";
import CurrentUser from "./components/CurrentUser";
import LoginWindow from "./components/LoginWindow";

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
  constructor(props: GameProps) {
    super(props);
  }
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

export const RootComponent: React.FunctionComponent<{}> = (props) => {
  var url = new URL("/websocket", window.location.href);

  url.protocol = url.protocol.replace("http", "ws");

  useEffect(() => {
    store.dispatch(connect(url.href));
  });
  return (
    <Provider store={store}>
      <Root />
    </Provider>
  );
};

// const mapStateToProps = (state: IState) => ({
//     count: countersSelectors.getReduxCounter(state.counters),
// });

// const dispatchProps = {
//     onIncrement: countersActions.in  crement,
// };

// export const FCCounterConnected = connect(
//     mapStateToProps,
//     dispatchProps
// )(RootComponent);
