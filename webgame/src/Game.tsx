import React, { Component, useEffect } from "react";
import { useDrag } from "react-dnd";
import { Card } from "./Card";
import { Hand } from "./Pile";
import { Hall, LoginWindow } from "./Hall";
import { PlayerLogin, Message, PlayerJoinGame } from "./Message";
import { Provider } from "react-redux";
import { store } from "./Store";
import { connect } from "@giantmachines/redux-websocket/dist";
import Connection from "./components/Connection";

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

interface GameProps {}

interface IState {}

class Root extends Component<GameProps, IState> {
  constructor(props: GameProps) {
    super(props);
    this.state = {
      articles: [
        { title: "React Redux Tutorial for Beginners", id: 1 },
        { title: "TypeScript tutorial for beginners", id: 2 },
      ],
    };
  }
  render() {
    return (
      <div>
        <Connection />
        <LoginWindow loginHandler={(x) => alert(x)} errorMessage="test" />
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
