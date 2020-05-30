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
  [1, "A"],
  [11, "J"],
  [12, "Q"],
  [13, "K"],
]);

const SUITS_UNICODE = ["♦", "♣", "♥", "♠"];
const CARD_BACK = "🂠";

export interface CardProps {
  index: number;
  value: number;
  highlight: boolean;
  onClick: (index: number, value: number) => void;
  fullSize: boolean;
  nonOverLap: number;
  age?: "new" | "old" | "older";
}

const Card: React.FunctionComponent<CardProps> = (props) => {
  // const [{ isDragging }, drag] = useDrag({
  // item: { type: ItemTypes.CARD },
  //   collect: (monitor) => ({
  //     isDragging: !!monitor.isDragging(),
  //   }),
  // });

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
        // ref={drag}
        className={`card ${suit} ${highlight} card-age-${props.age ?? "old"}`}
        src={"resources/" + name + ".png"}
        alt={name}
        style={{ marginLeft: props.index * props.nonOverLap }}
        onClick={(event: React.MouseEvent<HTMLElement>) =>
          props.onClick(props.index, props.value)
        }
        data-tooltip={props.value}
      />
    );
  } else {
    let unicode: string;
    let value: string;
    let css;
    if (name === "red_joker") {
      value = unicode = "🂿";
      css = "red_joker";
    } else if (name === "black_joker") {
      value = unicode = "🂿";
      css = "black_joker";
    } else {
      css = SUITS[s].toLowerCase();
      if (NUMBERS_TO_CARD_CHAR.has(num)) {
        unicode = SUITS_UNICODE[s];
        value = "" + NUMBERS_TO_CARD_CHAR.get(num);
      } else {
        unicode = SUITS_UNICODE[s];
        value = (props.value % 13) + 1 + "";
      }
    }
    return (
      <div
        className={`${css} card-small ${highlight} card-age-${
          props.age ?? "old"
        }`}
      >
        <div>{value}</div>
        <div>{unicode}</div>
      </div>
    );
  }
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
export { Card, CARD_BACK, Cardback };
