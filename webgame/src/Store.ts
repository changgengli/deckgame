import reduxWebsocket, { send } from "@giantmachines/redux-websocket";

import { configureStore } from "@reduxjs/toolkit";
import thunk from "redux-thunk";
import { ConnectionStatus, GameInHall } from "./Types";
import { stat } from "fs";

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

interface PileState {
  name: string;
  visible: boolean;
  cards: CardState[];
  count: number;
  sortable: boolean;
  orderBy: "natural" | "numberThenSuit" | "suitThenNumber";
}
interface GameState {
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

function sortCards(
  cards: CardState[],
  orderBy: PileState["orderBy"]
): CardState[] {
  if (orderBy === "natural") {
    return cards;
  }
  /*  let s = Math.floor(props.value / 13);
  let num = (props.value % 13) + 1;
  let highlight = props.highlight ? "card-highlight" : "";
  let suit;
  if (props.value === 53) {
    suit = name = "red_joker";
  } else if (props.value === 52) {
    suit = name = "black_joker";
*/
  cards.sort((a, b): number => {
    if (orderBy === "suitThenNumber") {
      return a.value - b.value;
    } else {
      let r = Math.floor(a.value / 13) - Math.floor(b.value / 13);
      return r !== 0 ? r : (a.value % 13) - (b.value % 13);
    }
  });
  return cards;
}

function mergeCards(
  cards: number[],
  existingCards: CardState[] | undefined,
  orderBy: PileState["orderBy"]
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
  return sortCards(secondRound, orderBy);
}

function isPileSortable(name: string): boolean {
  let n = name.split("#")[0];
  switch (n) {
    case "hand":
      return true;
    case "discard_pile":
      return false;
    default:
      return false;
  }
}
function merge(gameState: GameState | undefined, data: FullGame): GameState {
  Object.entries(data.piles_cards).map(([name, cards]) => {
    return [
      name,
      {
        name,
        position: 0, // don't care for now,
        visible: cards.length !== 0,
        count: data.card_counts[name],

        cards:
          cards.length === 0
            ? cards
            : mergeCards(
                cards,
                gameState?.piles[name]?.cards,
                gameState?.piles[name]?.orderBy ?? "natural"
              ),
        sortable: isPileSortable(name),
        orderBy: gameState?.piles[name]?.orderBy ?? "natural",
      },
    ];
  });

  return {
    id: data.game.id,
    position: data.position,
    players: data.game.players,
    players_ready: data.players_ready,
    piles: {},
  };
}

function addCardsToPile(pile: PileState, cards: number[]): PileState {
  let result = { ...pile };
  result.count += cards.length;
  cards.forEach((c) =>
    result.cards.push({ value: c, selected: false, timestamp: Date.now() })
  );
  sortCards(result.cards, pile.orderBy);
  return result;
}
function removeCardsFromPile(pile: PileState, cards: number[]): PileState {
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

  result.cards = sortCards(secondRound, result.orderBy);
  return result;
}

const message = (state: State, action: any): State => {
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
      if (state.game && state.game.id === data.id) {
        let gr = [...state.game.players_ready];
        gr[data.position] = true;
        return {
          ...state,
          game: {
            ...state.game,
            players_ready: gr,
          },
        };
      }

      return state;

    case "FullGame":
      let mergedGame = merge(state.game, data);
      return {
        ...state,
        game: mergedGame,
      };
    case "MoveCard":
      let piles: GameState["piles"] = { ...state.game?.piles };
      piles[data.source] = removeCardsFromPile(
        state.game?.piles[data.source] as PileState,
        data.cards
      );
      piles[data.destination] = addCardsToPile(
        state.game?.piles[data.destination] as PileState,
        data.cards
      );
      /*
    MoveCard {
        position: u8,
        source: game::Pile,
        destination: game::Pile,
        cards: Vec<card::Card>,
    }, */
      return {
        ...state,
        game: state.game
          ? {
              ...state.game,
              piles,
            }
          : undefined,
      };

    case "HiddenMoveCard": {
      /*
    HiddenMoveCard {
        position: u8,
        source: game::Pile,
        destination: game::Pile,
        total_cards: u16,
    },*/
      let piles: GameState["piles"] = { ...state.game?.piles };
      piles[data.source].count += data.total_cards;
      piles[data.destination].count += data.total_decks;
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
