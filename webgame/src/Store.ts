import reduxWebsocket, { send } from "@giantmachines/redux-websocket";

import { configureStore } from "@reduxjs/toolkit";
import thunk from "redux-thunk";
import { ConnectionStatus, GameInHall } from "./Types";
import { stat } from "fs";
import {
  CLICK_CARD,
  ClickCardAction,
  DISMISS_ERROR,
  SET_SORTER,
  SetSorterAction,
} from "./Actions";

interface HallState {
  players: string[];
  games: Record<number, GameInHall>;
  currentGame?: { id: number; position: number } | undefined;
}

interface CardState {
  value: number;
  selected: boolean;
  timestamp: number;
}

export interface PileState {
  name: string;
  visible: boolean;
  cards: CardState[];
  count: number;
  sorter: Sorter | undefined;
}

export interface Sorter {
  orderBy: "natural" | "bySuit" | "byNumber";
  trumpCard?: undefined | number;
}

function applySorter(
  cards: CardState[],
  sorter: Sorter | undefined
): CardState[] {
  if (!sorter || sorter.orderBy === "natural") {
    return cards;
  }

  const f = function (card: CardState): number {
    let suit = Math.floor(card.value / 13);
    let value = card.value % 13;
    let trumpColor = false;
    let trumpValue = false;
    if (
      sorter.trumpCard !== undefined &&
      sorter.trumpCard !== 52 &&
      sorter.trumpCard !== 53
    ) {
      if (suit === Math.floor(sorter.trumpCard / 13)) {
        trumpColor = true;
      }
      if (value == sorter.trumpCard % 13) {
        trumpValue = true;
      }
    }
    if (value === 0) {
      value = 13;
    }

    switch (card.value) {
      case 53:
      case 52:
        return card.value * 100;
      default:
        if (trumpColor) {
          value = value + 100;
          if (trumpValue) {
            value = value + 200;
          }
          return value;
        } else if (trumpValue) {
          return value + 150 + suit;
        }
        return suit * 13 + value;
    }
  };

  function nf(x: CardState): number {
    switch (x.value) {
      case 52:
        return 52;
      case 53:
        return 53;
      default:
        return x.value % 13;
    }
  }
  cards.sort((a, b): number => {
    if (sorter.orderBy === "byNumber") {
      return nf(a) - nf(b);
    } else {
      return f(a) - f(b);
    }
  });
  return cards;
}

export interface GameState {
  position: number;
  id: number;
  piles: Record<string, PileState>;
  players: Array<string | undefined>;
  players_ready: boolean[];
}

export interface State {
  connection: ConnectionStatus;
  myId?: string | undefined;
  hall: HallState;
  game?: GameState | undefined;
  login?: {
    errorMessage?: string | undefined;
  };
  error?: {
    message: string;
    timestamp: number;
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

interface FullGame {
  game: {
    id: number;
    players: Array<string | undefined>;
    total_decks: number;
    cards_to_reserve: number;
  };

  position: number;
  card_counts: Record<string, number>;
  piles_cards: Record<string, number[]>;
  players_ready: boolean[];
}

// function sortCards(
//   cards: CardState[],
//   orderBy: PileState["orderBy"]
// ): CardState[] {
//   if (orderBy === "natural") {
//     return cards;
//   }
//   /*  let s = Math.floor(props.value / 13);
//   let num = (props.value % 13) + 1;
//   let highlight = props.highlight ? "card-highlight" : "";
//   let suit;
//   if (props.value === 53) {
//     suit = name = "red_joker";
//   } else if (props.value === 52) {
//     suit = name = "black_joker";
// */
//   cards.sort((a, b): number => {
//     if (orderBy === "suitThenNumber") {
//       return a.value - b.value;
//     } else {
//       let r = Math.floor(a.value / 13) - Math.floor(b.value / 13);
//       return r !== 0 ? r : (a.value % 13) - (b.value % 13);
//     }
//   });
//   return cards;
// }

function mergeCards(
  cards: number[],
  existingCards: CardState[] | undefined,
  sorter: PileState["sorter"]
): CardState[] {
  if (!existingCards) {
    return cards.map((c) => {
      return { value: c, selected: false, timestamp: Date.now() };
    });
  }
  let incomingCardCount = cards.reduce((m: Record<number, number>, c): Record<
    number,
    number
  > => {
    if (c in m) {
      m[c]++;
    } else {
      m[c] = 1;
    }
    return m;
  }, {});

  let existingCardCount = existingCards.reduce(
    (m: Record<number, number>, c): Record<number, number> => {
      if (c.value in m) {
        m[c.value]++;
      } else {
        m[c.value] = 1;
      }
      return m;
    },
    {}
  );

  let newCardStates = [];
  // first round only deleted selected
  for (let card of existingCards) {
    if (
      card.selected &&
      (existingCardCount[card.value] ?? 0) >
        (incomingCardCount[card.value] ?? 0)
    ) {
      incomingCardCount[card.value]--;
      continue;
    }
    newCardStates.push(card);
  }

  // second round, deleted from right
  let secondRound = [];
  for (let card of newCardStates.reverse()) {
    if (
      (existingCardCount[card.value] ?? 0) >
      (incomingCardCount[card.value] ?? 0)
    ) {
      incomingCardCount[card.value]--;
      continue;
    }
    secondRound.push(card);
  }

  secondRound = secondRound.reverse();
  // now add any remaining

  Object.entries(incomingCardCount).forEach(([value, count]) => {
    if (count < 0) {
      console.log("something is wrong ", count, value);
    }
    Array(count)
      .fill(1)
      .forEach(() =>
        secondRound.push({ value, selected: false, timestamp: Date.now() })
      );
  });
  return applySorter(secondRound, sorter);
}
// function getPileOrderBy(name: string): PileState["sorter"] {
//   let n = name.split("#")[0];
//   switch (n) {
//     case "hand":
//       return "suitThenNumber";

//     default:
//       return "natural";
//   }
// }
function merge(gameState: GameState | undefined, data: FullGame): GameState {
  let piles: GameState["piles"] = Object.fromEntries(
    Object.entries(data.piles_cards).map(([name, cards]) => {
      // console.log("pile ", name, ", cards count, ", data.card_counts[name]);
      return [
        name,
        {
          name,
          visible: true, //TODO
          count: data.card_counts[name],

          cards:
            cards.length === 0
              ? []
              : mergeCards(
                  cards,
                  gameState?.piles[name]?.cards,
                  gameState?.piles[name]?.sorter
                ),
          sorter: gameState?.piles[name]?.sorter,
        },
      ];
    })
  );

  return {
    id: data.game.id,
    position: data.position,
    players: data.game.players,
    players_ready: data.players_ready,
    piles: piles,
  };
}

function addCardsToPile(pile: PileState, cards: number[]): PileState {
  let result = { ...pile };
  result.count += cards.length;
  cards.forEach((c) =>
    result.cards.push({ value: c, selected: false, timestamp: Date.now() })
  );
  applySorter(result.cards, pile.sorter);
  return result;
}
function removeCardsFromPile(pile: PileState, cards: number[]): PileState {
  // console.log("before remove", pile);
  let result = { ...pile };
  result.count -= cards.length;

  let incomingCardCount = cards.reduce((m: Record<number, number>, c): Record<
    number,
    number
  > => {
    if (c in m) {
      m[c]++;
    } else {
      m[c] = 1;
    }
    return m;
  }, {});

  let newCardStates = [];
  // first round only deleted selected
  for (let card of result.cards) {
    if (
      card.selected &&
      card.value in incomingCardCount &&
      incomingCardCount[card.value] > 0
    ) {
      incomingCardCount[card.value]--;
      continue;
    }
    newCardStates.push(card);
  }

  // second round, deleted from right
  let secondRound = [];
  for (let card of newCardStates.reverse()) {
    if (card.value in incomingCardCount && incomingCardCount[card.value] > 0) {
      incomingCardCount[card.value]--;
      continue;
    }
    secondRound.push(card);
  }

  secondRound = secondRound.reverse();
  // now add any remaining

  result.cards = applySorter(secondRound, result.sorter);
  return result;
}

const message = (state: State, action: any): State => {
  let data = JSON.parse(action.payload.message);
  // console.log("message", data);
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
        console.log("set my position to ", data.position);
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
    case "PlayerLeftGame":
      if (data.player === state.myId) {
        return {
          ...state,
          hall: {
            ...state.hall,
            currentGame: undefined,
          },
        };
      }

    case "PlayerReady":
      if (state.game && state.game.id === data.game_id) {
        let gr = [...state.game.players_ready];
        gr[data.position] = true;
        return {
          ...state,
          game: {
            ...state.game,
            players_ready: gr,
          },
        };
      } else {
        console.log("game not stared", state.game, data);
      }

      return state;

    case "FullGame":
      let mergedGame = merge(state.game, data);
      return {
        ...state,
        game: mergedGame,
      };
    case "BadMessage":
      return {
        ...state,
        error: {
          message: data.message,
          timestamp: Date.now(),
        },
      };
    case "MoveCard":
      console.log(
        `move ${data.source} -> ${data.destination} ${data.cards.join(",")}`
      );
      let piles: GameState["piles"] = {
        ...state.game?.piles,
        [data.source]: { ...state.game?.piles[data.source] },
        [data.destination]: { ...state.game?.piles[data.destination] },
      };
      piles[data.source] = removeCardsFromPile(
        state.game?.piles[data.source] as PileState,
        data.cards
      );
      piles[data.destination] = addCardsToPile(
        state.game?.piles[data.destination] as PileState,
        data.cards
      );
      return {
        ...state,
        game: {
          ...(state.game as GameState),
          piles,
        },
      };

    case "HiddenMoveCard": {
      // console.log("hidden move ", data);
      let piles: GameState["piles"] = {
        ...state.game?.piles,
        [data.source]: { ...state.game?.piles[data.source] },
        [data.destination]: { ...state.game?.piles[data.destination] },
      };
      piles[data.source].count -= data.total_cards;
      piles[data.destination].count += data.total_cards;
      return {
        ...state,
        game: state.game
          ? {
              ...state.game,
              piles,
            }
          : undefined,
      };
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
  // console.log("root reducer", action, state);
  let myId;
  switch (action.type) {
    case "REDUX_WEBSOCKET::BROKEN":
    case "REDUX_WEBSOCKET::CLOSED":
      myId = undefined;
      return {
        ...state,
        connection: connectionReducer(state.connection, action),
        myId,
        game: undefined,
        hall: {
          players: [],
          games: {},
        },
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
    case SET_SORTER:
      let g = state.game as GameState;
      let aa = action as SetSorterAction;
      return {
        ...state,
        game: {
          ...g,
          piles: {
            ...g.piles,

            [aa.pile]: {
              ...(g.piles[aa.pile] as PileState),
              cards: applySorter(g.piles[aa.pile].cards, aa.sorter),
              sorter: aa.sorter,
            },
          },
        },
      };

    case CLICK_CARD:
      let a = action as ClickCardAction;
      let game = state.game as GameState;
      let cards = [...game.piles[a.pile].cards];
      cards[a.index].selected = !cards[a.index].selected;

      return {
        ...state,
        game: {
          ...game,
          piles: {
            ...game.piles,

            [a.pile]: {
              ...(game.piles[a.pile] as PileState),
              cards,
            },
          },
        },
      };
    case DISMISS_ERROR:
      let { error, ...newState } = state;
      return newState;

    case "DEBUG":
      return action;
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

export const ItemTypes = {
  CARD: "card",
  PILE: "pile",
};
