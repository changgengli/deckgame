import React from "react";
import { Card } from "./Card";
/*
interface HandProps {
  cards: number[];
  trumpNumber: number | undefined;
  trumpColor: number | undefined;
  highlights: Map<number, boolean>;
  onCardClick: (index: number) => void;
}

const Hand: React.FunctionComponent<HandProps> = (props) => {
  let cards = props.cards.map((c, i) => (
    <Card
      fullSize={true}
      value={c}
      index={i}
      highlight={props.highlights.get(i) || false}
      onClick={props.onCardClick}
      nonOverLap={25}
    />
  ));
  return <div className="hand-pile"> {cards} </div>;
};

interface DiscardPileProps {
  cards: number[][];
  onCardClick: (index: number) => void;

  highlights: Map<number, boolean>;
}
const DiscardPile: React.FunctionComponent<DiscardPileProps> = (props) => {
  let cards = props.cards.map((a) => {
    let row = a.map((c, i) => (
      <Card
        fullSize={false}
        value={c}
        index={i}
        highlight={props.highlights.get(i) || false}
        onClick={props.onCardClick}
        nonOverLap={0}
      />
    ));
    return <div className="pile-row"> {row}</div>;
  });
  return <div className="dicard-pile">{cards}</div>;
};
*/

/*
 Hand(p) => format!("hand_{}", p),
            DiscardPile(p) => format!("discard_pile_{}", p),
            ScorePile(p) => format!("score_pile_{}", p),
            ClaimPile(p) => format!("claim_piple_{}", p),
            HiddenBuryPile(p) => format!("hidden_bury_pile_{}", p),
            DrawPile => "draw_pile".to_owned(),
            ReservedPile => "reserved_piple".to_owned(), //shared
            VisibleBuryPile => "visible_bury_pile".to_owned(),
            SharedScorePile => "shared_score_pile".to_owned(),/
*/
// export { Hand, DiscardPile };
