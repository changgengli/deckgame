import React from "react";
import { useDrag } from "react-dnd";
import { ItemTypes } from "./Store";

const SUITS = ["diamonds", "clubs", "hearts", "spades"];
const NUMBERS_TO_CARD_IMAGE: Map<number, string> = new Map([
  [1, "ace"],
  [11, "jack"],
  [12, "queen"],
  [13, "king"],
]);

const NUMBERS_TO_CARD_CHAR = new Map([
  [0, "A"],
  [10, "J"],
  [11, "Q"],
  [12, "K"],
]);

const SUITS_UNICODE = ["♦", "♣", "♥", "♠"];
// const CARD_BACK = "🂠";
export function getCardShortString(value: number): string {
  if (value === 52 || value === 53) {
    return "🂿";
  }
  let unicode;
  let s = Math.floor(value / 13);
  let v = Math.floor(value % 13);
  if (NUMBERS_TO_CARD_CHAR.has(v)) {
    unicode = SUITS_UNICODE[s] + "" + NUMBERS_TO_CARD_CHAR.get(v);
  } else {
    unicode = SUITS_UNICODE[s] + "" + (v + 1);
  }
  return unicode;
}
export interface CardProps {
  index: number;
  value: number;
  highlight: boolean;
  onClick: (index: number, value: number) => void;
  fullSize: boolean;
  nonOverLap: number;
  age?: "new" | "old" | "older";
  dragging: boolean;
  pile: string; // pile name used for dragging support
  offset: number;
}

let getNameAndSuit = function (value: number): [string, string] {
  let name: string;
  let s = Math.floor(value / 13);
  let num = (value % 13) + 1;
  let suit: string;
  if (value === 53) {
    suit = name = "red_joker";
  } else if (value === 52) {
    suit = name = "black_joker";
  } else {
    suit = SUITS[s];
    name =
      "" +
      (NUMBERS_TO_CARD_IMAGE.has(num) ? NUMBERS_TO_CARD_IMAGE.get(num) : num) +
      "_of_" +
      suit;
  }

  return [name, suit];
};

/**
 * for drag and drop only, full size
 */
const SimpleCard: React.FunctionComponent<{
  index: number;
  value: number;
}> = (props: { index: number; value: number }) => {
  let [name, suit] = getNameAndSuit(props.value);
  return (
    <img
      className={`card ${suit}  "older"}`}
      src={"resources/" + name + ".png"}
      alt={name}
      style={{
        marginLeft: props.index * 25,
      }}
    />
  );
};

const DumbCard: React.FunctionComponent<{
  value: number;
}> = (props: { value: number }) => {
  let [name, suit] = getNameAndSuit(props.value);
  return (
    <img
      className={`card ${suit} dumb}`}
      src={"resources/" + name + ".png"}
      alt={name}
    />
  );
};

export interface SmallCardProps {
  index: number;
  value: number;
  nonOverLap: number;
  age?: "new" | "old" | "older";
}
/**
 *
 * for other people's visible pile, not interactive
 * but show age
 */
const SmallCard: React.FunctionComponent<SmallCardProps> = (props) => {
  let [name, suit] = getNameAndSuit(props.value);
  // if (props.fullSize) {
  return (
    <img
      className={`card ${suit} card-small card-age-${props.age ?? "older"}`}
      src={"resources/" + name + ".png"}
      alt={name}
      style={{
        marginLeft: props.index * props.nonOverLap,
      }}
      data-tooltip={props.value}
    />
  );
};
const Card: React.FunctionComponent<CardProps> = (props) => {
  const [{ isDragging }, drag] = useDrag({
    item: {
      type: ItemTypes.CARD,
      pile: { name: props.pile, cards: [props.value] },
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    canDrag: () => !props.highlight,
  });
  let highlight = props.highlight ? "card-highlight" : "";
  let [name, suit] = getNameAndSuit(props.value);
  // if (props.fullSize) {
  return (
    <img
      ref={drag}
      className={`card ${suit} ${highlight} card-age-${props.age ?? "older"}`}
      src={"resources/" + name + ".png"}
      alt={name}
      style={{
        marginLeft: (props.index - props.offset) * props.nonOverLap,
        filter:
          isDragging || (props.dragging && props.highlight)
            ? "blur(1px)"
            : "none",
      }}
      onClick={(event: React.MouseEvent<HTMLElement>) =>
        props.onClick(props.index, props.value)
      }
      data-tooltip={props.value}
    />
  );
  // }

  // else {
  //   let unicode: string;
  //   let value: string;
  //   let css;
  //   if (name === "red_joker") {
  //     value = unicode = "🂿";
  //     css = "red_joker";
  //   } else if (name === "black_joker") {
  //     value = unicode = "🂿";
  //     css = "black_joker";
  //   } else {
  //     css = SUITS[s].toLowerCase();
  //     if (NUMBERS_TO_CARD_CHAR.has(num)) {
  //       unicode = SUITS_UNICODE[s];
  //       value = "" + NUMBERS_TO_CARD_CHAR.get(num);
  //     } else {
  //       unicode = SUITS_UNICODE[s];
  //       value = (props.value % 13) + 1 + "";
  //     }
  //   }
  // return (
  //   <div
  //     className={`${css} card-small ${highlight} card-age-${
  //       props.age ?? "old"
  //     }`}
  //   >
  //     <div>{value}</div>
  //     <div>{unicode}</div>
  //   </div>
  // );
  // }
};

function calculateMargin(index: number, total: number, margin: number): number {
  if (total <= 5) {
    return index * margin;
  }
  let shrinkCount = total - 5;
  let shrink = Math.max(margin / 3, 2);
  if (index < shrinkCount) {
    return shrink * index;
  }

  return shrinkCount * shrink + margin * (index - shrinkCount);
}

const Cardback: React.FunctionComponent<{ index: number; total: number }> = ({
  index,
  total,
}) => {
  return (
    <div
      className="card-back card"
      style={{
        marginLeft: calculateMargin(index, total, 4),
      }}
    ></div>
  );
};
export { Card, Cardback, SimpleCard, SmallCard, DumbCard };
