import React, { useState } from "react";
import { connect } from "react-redux";
import { State, Sorter } from "../Store";
import { DumbCard, getCardShortString } from "../Card";
import { SET_SORTER } from "../Actions";
const SorterComponent: React.FunctionComponent<{
  pile: string;
  sorter: Sorter | undefined;
  onSetSorter: (pile: string, sorter: Sorter) => void;
}> = ({ onSetSorter, sorter, pile }) => {
  // let [sorter, setSorter] = useState({ orderBy: "bySuit" } as Sorter);

  let [showSorterWindow, setShowSorter] = useState(false);

  function setSorter(s: Sorter) {
    onSetSorter(pile, s);
    setShowSorter(false);
  }
  let sorterWindow = (
    <div className={`sorter-window`}>
      <div className="head">
        <button onClick={() => setSorter({ orderBy: "natural" })}>
          Don't Sort
        </button>
        <button onClick={() => setSorter({ orderBy: "byNumber" })}>
          Sort by Card Value
        </button>
        <button data-tooltip="click a card below">
          Trump card and sort by Suit: Select Trump Card Below
        </button>
        <button onClick={() => setShowSorter(false)}>Cancel</button>
      </div>
      <div className="cards">
        {new Array(54).fill(1).map((_, index) => (
          <div
            key={`sorter-card-${index}`}
            onClick={() => setSorter({ orderBy: "bySuit", trumpCard: index })}
          >
            <DumbCard value={index} />
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <>
      <div
        className={`sorter`}
        onClick={() => setShowSorter(true)}
        data-tooltip="change sort setting"
      >
        ⇅ [{sorter ? sorter.orderBy.replace("by", "") : null}
        {sorter?.trumpCard !== undefined
          ? getCardShortString(sorter?.trumpCard)
          : null}
        ]
      </div>
      {showSorterWindow ? sorterWindow : null}
    </>
  );
};
export default connect(
  (state: State, ownProps: { pile: string }) => {
    return {
      sorter: state.game?.piles[ownProps.pile]?.sorter,
      pile: ownProps.pile,
    };
  },
  (dispatch) => {
    return {
      onSetSorter: (pile: string, sorter: Sorter) => {
        dispatch({ type: SET_SORTER, pile, sorter });
      },
    };
  }
)(SorterComponent);
