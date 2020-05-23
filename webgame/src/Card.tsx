import React from "react";

const SUITS = ["diamonds", "clubs", "hearts", "spades"];
const NUMBERS_TO_CARD_IMAGE: Map<number, string> = new Map([
  [1, "ace"],
  [11, "jack"],
  [12, "queen"],
  [13, "king"],
]);

const NUMBERS_TO_CARD_CHAR = new Map([
  [1, "A"],
  [11, "J"],
  [12, "Q"],
  [13, "K"],
]);

const SUITS_UNICODE = ["♦", "♣", "♥", "♠"];
const CARD_BACK = "🂠";

interface CardProps {
  index: number;
  value: number;
  highlight: boolean;
  onClick: (value: number) => void;
  fullSize: boolean;
  nonOverLap: number;
}

const Card: React.FunctionComponent<CardProps> = (props) => {
  let name;
  let s = Math.floor(props.value / 13);
  let num = (props.value % 13) + 1;
  let highlight = props.highlight ? "card-highlight" : "";
  let suit;
  if (props.value === 53) {
    suit = name = "red_joker";
  } else if (props.value === 52) {
    suit = name = "black_joker";
  } else {
    suit = SUITS[s];
    name =
      "" +
      (NUMBERS_TO_CARD_IMAGE.has(num) ? NUMBERS_TO_CARD_IMAGE.get(num) : num) +
      "_of_" +
      suit;
  }
  if (props.fullSize) {
    return (
      <img
        className={`card ${suit} ${highlight}`}
        src={"resources/" + name + ".png"}
        alt={name}
        style={{ left: props.index * props.nonOverLap }}
        onClick={(event: React.MouseEvent<HTMLElement>) =>
          props.onClick(props.index)
        }
      />
    );
  } else {
    let unicode: string;
    let css;
    if (name === "red_joker") {
      unicode = "🂿";
      css = "red_joker";
    } else if (name === "black_joker") {
      unicode = "🂿";
      css = "black_joker";
    } else {
      css = SUITS[s].toLowerCase();
      if (NUMBERS_TO_CARD_CHAR.has(num)) {
        unicode = SUITS_UNICODE[s] + NUMBERS_TO_CARD_CHAR.get(num);
      } else {
        unicode = SUITS_UNICODE[s] + ((props.value % 13) + 1) + "";
      }
    }
    return <span className={`${css} card-small ${highlight}`}>{unicode}</span>;
  }
};
export { Card, CARD_BACK };
