import React, { useState, useEffect } from "react";
import { State, GameState, PileState, ItemTypes, Sorter } from "../Store";
import { connect } from "react-redux";
import { send } from "@giantmachines/redux-websocket";
import { Card, Cardback, SimpleCard, SmallCard } from "../Card";
import { CLICK_CARD, ClickCardAction } from "../Actions";
import {
  DndProvider,
  useDrop,
  DropTargetMonitor,
  useDrag,
  useDragLayer,
  XYCoord,
} from "react-dnd";
import HTML5Backend, { getEmptyImage } from "react-dnd-html5-backend";
import { PileDragState } from "../Types";
import SorterComponent from "./SorterComponent";

type ClickPileCard = (pile: string, index: number, value: number) => void;
type MoveCard = (
  source: string,
  destination: string,
  cards: number[] | undefined
) => void;

const animalIcons = [
  "🐣",
  "🐺",
  "🦄",
  "🐮",
  "🐷",
  "🐭",
  "🐹",
  "🐰",
  "🐼",
  "🦇",
  "🦒",
  "🐶",
  "🐵",
  "🐞",
];
const OtherPlayerHiddenPile: React.FunctionComponent<{
  title: string;
  count: number;
}> = ({ title, count }) => {
  return count === 0 ? null : (
    <div className="other-player-pile-title">
      {title}·{count}
    </div>
  );
};

const HiddenPile: React.FunctionComponent<{
  pile: PileState;
  title: string;
  onMoveCard: MoveCard;
}> = ({ pile, title, onMoveCard }) => {
  const [{ isOver }, drop] = useDrop({
    accept: [ItemTypes.PILE, ItemTypes.CARD],
    drop: (item: { type: string; pile: PileDragState }, monitor) => {
      if (item === undefined) {
        console.log("not an item dragged");
        return;
      }
      onMoveCard(item.pile.name, pile.name, item.pile.cards);
    },
    // hover: (item, monitor) =>
    //   console.log(`Hovering`, item, ` to ${pile.name}`, monitor),
    collect: (monitor: DropTargetMonitor) => {
      return {
        isOver: monitor.isOver() && monitor.getItem().pile.name !== pile.name,
      };
    },
  });

  const [{ isDragging }, dragRef] = useDrag({
    item: {
      type: ItemTypes.PILE,
      pile: {
        // cards: pile.cards.filter((c) => c.selected).map((c) => c.value),
        name: pile.name,
      },
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    // begin: (monitor) => console.log("begin dragging", monitor.getItem()),
    // end: (item: { type: string; pile: PileState } | undefined, monitor) => {
    //   console.log("end dragging", item);
    // },
    canDrag: () => pile.count !== 0,
  });

  return (
    <div
      ref={drop}
      style={{
        filter: isDragging ? "blur(1px)" : isOver ? "sepia(0.5)" : "none",
      }}
    >
      <div ref={dragRef} className="hidden-pile">
        <div className="title">
          {title}
          {pile.count === 0 ? "" : `·${pile.count}`}
        </div>
        <div className="card-list">
          {Array(pile.count)
            .fill(1)
            .map((_, i) => (
              <Cardback
                index={i}
                key={`${pile.name}-${i}`}
                total={pile.count}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

interface PileProps {
  pile: PileState;
  clickCard: ClickPileCard;
  title: string;
  onMoveCard: MoveCard;
  maxCards?: number;
}

interface CustomDragLayerProps {}
export const CustomDragLayer: React.FC<CustomDragLayerProps> = (props) => {
  const {
    itemType,
    item,
    initialOffset,
    initialClientOffset,
    currentOffset,
    isDragging,
  } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    initialOffset: monitor.getInitialSourceClientOffset(),
    currentOffset: monitor.getSourceClientOffset(),
    initialClientOffset: monitor.getInitialClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  function getItemStyles(
    initialOffset: XYCoord | null,
    currentOffset: XYCoord | null
  ): React.CSSProperties {
    if (!initialOffset || !currentOffset || !initialClientOffset) {
      return {
        display: "none",
      };
    }
    let { x, y } = currentOffset;
    const transform = `translate(${
      x + initialClientOffset.x - initialOffset.x - 50
    }px, ${y}px)`;
    return {
      transform,
      WebkitTransform: transform,
      position: "fixed",
      display: "inline-block",
    };
  }

  function renderItem() {
    switch (itemType) {
      case ItemTypes.PILE:
        let pile = item.pile as PileDragState;
        return pile.cards === undefined ? null : (
          <div className="card-list">
            {pile.cards.map((c, i) => (
              <SimpleCard index={i} value={c} key={`drag-${c}`} />
            ))}
          </div>
        );
      default:
        return null;
    }
  }

  const layerStyles: React.CSSProperties = {
    position: "fixed",
    pointerEvents: "none",
    zIndex: 100,
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
    border: "none",
  };

  if (!isDragging) {
    return null;
  }
  return (
    <div style={layerStyles} className="drag-layer">
      <div style={getItemStyles(initialOffset, currentOffset)}>
        {renderItem()}
      </div>
    </div>
  );
};

const OtherPlayerVisiblePile: React.FunctionComponent<{
  pile: PileState;
  title: string;
}> = ({ pile, title }) => {
  let timestamps = [...new Set(pile.cards)]
    .map((c) => c.timestamp)
    .sort()
    .reverse();
  return (
    <div className="visible-pile">
      <div className="title">{title}</div>
      <div className="card-list">
        {pile.cards.map((c, i) => (
          <SmallCard
            key={`${pile.name}-${i}`}
            index={i}
            value={c.value}
            age={
              c.timestamp === timestamps[0]
                ? "new"
                : timestamps.length > 1 && c.timestamp === timestamps[1]
                ? "old"
                : "older"
            }
            nonOverLap={22}
          ></SmallCard>
        ))}
      </div>
    </div>
  );
};

const VisiblePile: React.FunctionComponent<PileProps> = ({
  pile,
  clickCard,
  title,
  onMoveCard,
  maxCards,
}) => {
  const [{ isOver }, drop] = useDrop({
    accept: [ItemTypes.PILE, ItemTypes.CARD],
    drop: (item: { type: string; pile: PileDragState }, monitor) => {
      // console.log(`Dropping`, item, ` to ${pile.name}`, monitor);
      if (item === undefined) {
        // console.log("not an item dragged");
        return;
      }
      onMoveCard(item.pile.name, pile.name, item.pile.cards);
    },
    // hover: (item, monitor) =>
    // console.log(`hovering`, item, ` to ${pile.name}`, monitor),
    collect: (monitor: DropTargetMonitor) => {
      if (monitor.getItem() != null && monitor.isOver()) {
        console.log("checking over");
      }
      return {
        isOver: monitor.isOver() && monitor.getItem().pile.name !== pile.name,
      };
    },
  });

  const [{ dragging }, dragRef, preview] = useDrag({
    item: {
      type: ItemTypes.PILE,
      pile: {
        cards: pile.cards.filter((c) => c.selected).map((c) => c.value),
        name: pile.name,
      },
    },
    collect: (monitor) => ({
      dragging: monitor.isDragging(),
    }),
    // begin: (monitor) => console.log("begin dragging", monitor.getItem()),
    // end: (item: { type: string; pile: PileState } | undefined, monitor) => {
    //   console.log("end dragging", item);
    // },

    canDrag: (
      monitor //if at least one card is selected
    ) => pile.cards.map((c) => c.selected).find((x) => x) !== undefined,
  });

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, []);

  let timestamps = [...new Set(pile.cards)]
    .map((c) => c.timestamp)
    .sort()
    .reverse();
  return (
    <div ref={drop}>
      <div
        className="visible-pile"
        ref={dragRef}
        style={{
          filter: isOver ? "sepia(0.5)" : "none",
        }}
      >
        <div className="title">{title}</div>
        <div className="card-list">
          {pile.cards.map((c, i) => {
            let offset =
              maxCards !== undefined && pile.cards.length > maxCards
                ? pile.cards.length - maxCards
                : 0;
            if (i < offset) {
              return null;
            }
            return (
              <Card
                key={`${pile.name}-${i}`}
                index={i}
                value={c.value}
                highlight={c.selected}
                fullSize={true}
                onClick={(index, value) => clickCard(pile.name, index, value)}
                nonOverLap={25}
                dragging={dragging}
                pile={pile.name}
                age={
                  c.timestamp === timestamps[0]
                    ? "new"
                    : timestamps.length > 1 && c.timestamp === timestamps[1]
                    ? "old"
                    : "older"
                }
                offset={offset}
              ></Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface GamePlayerProps {
  player: string | undefined;
  position: number;
  totalPlayer: number;
  readyForNextGame: boolean;
  currentPlayerPosition: number;
}

const GamePlayer: React.FunctionComponent<GamePlayerProps> = (
  props: GamePlayerProps
) => {
  // compute top and left
  const radius = 360;
  const center = 320;

  let relativePostion = props.position - props.currentPlayerPosition;
  if (relativePostion < 0) {
    relativePostion += props.totalPlayer;
  }
  relativePostion = relativePostion - 1;

  const style = { order: relativePostion };
  // let className = "player";
  let player = props.player ?? "<disconnected>";
  let position = props.position;
  return (
    <div className="player" style={style}>
      <div className="head">
        <div>{position}</div>
        <div className="avatar">
          {animalIcons[position % animalIcons.length]}
        </div>
        <div className="name">{player}</div>
        <div className="check">
          {props.readyForNextGame ? <span>☑</span> : <span>▶</span>}
        </div>
        <OtherPlayerHiddenPileContainer
          title={`手牌`}
          name={`hand#${position}`}
        />
        <OtherPlayerHiddenPileContainer
          title={`扣牌`}
          name={`hidden_bury_pile#${position}`}
        />
      </div>
      <OtherPlayerVisiblePileContainer
        title={`得分`}
        name={`score_pile#${position}`}
      />
      <VisiblePileContainer
        title={`出牌`}
        name={`discard_pile#${position}`}
        maxCards={12}
      />
    </div>
  );
};

const Me: React.FunctionComponent<{
  name: string;
  onClickReady: () => void;
  position: number;
  readyForNextGame: boolean;
}> = ({ onClickReady, name, readyForNextGame, position }) => {
  return (
    <div className="me">
      <div className="head">
        <span className="arrow">▼</span>
        <div className="avatar">
          {animalIcons[position % animalIcons.length]}
        </div>
        <div className="name">{name}</div>
        <div className="check" onClick={onClickReady}>
          {readyForNextGame ? (
            <span data-tooltip="Waiting for other players to start">☑</span>
          ) : (
            <div style={{ cursor: "pointer" }}>
              Click to start next game
              <span className="arrow" style={{ padding: "20px" }}>
                ▶
              </span>
            </div>
          )}
        </div>

        <SorterComponent pile={`hand#${position}`} />
        <span className="arrow">▼</span>
      </div>
      <div className="piles">
        <div className="pile-row discard-row">
          <VisiblePileContainer
            title={`出牌`}
            name={`discard_pile#${position}`}
          />
          <VisiblePileContainer
            title={`得分`}
            name={`score_pile#${position}`}
          />
        </div>
        <div className="pile-row hand-row">
          <VisiblePileContainer title={`手牌`} name={`hand#${position}`} />
          <HiddenPileContainer
            title={`扣牌`}
            name={`hidden_bury_pile#${position}`}
          />
        </div>
      </div>
    </div>
  );
};
const GameRoom: React.FunctionComponent<{
  game: GameState;
}> = ({ game }) => {
  const [_id, setId] = useState("");

  let players = game.players.map((_player, index) =>
    index !== game.position ? (
      <GamePlayerContainer key={`game-player-${index}`} position={index} />
    ) : null
  );
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="game-window">
        <div className="game-room-outer">
          <div className="game-room">
            <CustomDragLayer />
            <div className="player-list">{players}</div>
            <div className="pile-row shared">
              <VisiblePileContainer title="得分" name="shared_score_pile" />
              <HiddenPileContainer title="牌堆" name="draw_pile" />
              <HiddenPileContainer title="底牌" name="reserved_pile" />
            </div>
            <MeContainer />
          </div>
        </div>
        <div className="messages"></div>
      </div>
    </DndProvider>
  );
};

const OtherPlayerVisiblePileContainer = connect(
  (state: State, props: { name: string; title: string }) => {
    return {
      title: props.title,
      pile: state.game?.piles[props.name] as PileState,
    };
  }
)(OtherPlayerVisiblePile);

const VisiblePileContainer = connect(
  (state: State, props: { name: string; title: string }) => {
    return {
      title: props.title,
      pile: state.game?.piles[props.name] as PileState,
    };
  },
  (dispatch) => {
    return {
      clickCard: (pile: string, index: number, value: number): void => {
        let action: ClickCardAction = {
          type: CLICK_CARD,
          pile,
          index,
          value,
        };
        dispatch(action);
      },

      onMoveCard: (
        source: string,
        destination: string,
        cards: number[] | undefined
      ) => {
        if (source === destination) {
          return;
        }
        dispatch(
          send({
            type: cards === undefined ? "MoveAllCard" : "MoveCard",
            source,
            destination,
            cards: cards,
          })
        );
      },
    };
  }
)(VisiblePile);

const OtherPlayerHiddenPileContainer = connect(
  (state: State, props: { title: string; name: string }) => {
    return {
      title: props.title,
      count: state.game?.piles[props.name].count ?? 0,
    };
  }
)(OtherPlayerHiddenPile);

const HiddenPileContainer = connect(
  (state: State, props: { name: string; title: string }) => {
    return {
      title: props.title,
      pile: state.game?.piles[props.name] as PileState,
    };
  },
  (dispatch) => {
    return {
      onMoveCard: (
        source: string,
        destination: string,
        cards: number[] | undefined
      ) => {
        if (source === destination) {
          return;
        }
        dispatch(
          send({
            type: cards === undefined ? "MoveAllCard" : "MoveCard",
            source,
            destination,
            cards: cards,
          })
        );
      },
    };
  }
)(HiddenPile);
const MeContainer = connect(
  (state: State) => {
    let game = state.game as GameState;
    let position = game.position;
    return {
      name: game.players[position] as string,
      postion: position,
      position: game.position,
      totalPlayer: game.players.length,
      readyForNextGame: game.players_ready[position],
    };
  },
  (dispatch) => {
    return {
      onClickReady: () => {
        dispatch(send({ type: "StartGame" }));
      },
    };
  }
)(Me);

const GamePlayerContainer = connect(
  (state: State, props: { position: number }) => {
    let game = state.game as GameState;
    let position = props.position;
    return {
      player: game.players[props.position],
      postion: position,
      currentPlayerPosition: game.position,
      hand: game.piles[`hand#${position}`],
      score: game.piles[`score_pile#${position}`],
      totalPlayer: game.players.length,
      readyForNextGame: game.players_ready[position],
      discard: game.piles[`discard_pile#${position}`],
      bury: game.piles[`hidden_bury_pile#${position}`],
    };
  }
)(GamePlayer);

export default connect(
  (state: State) => {
    let game = state.game as GameState;
    return {
      game,
    };
  },
  (dispatch) => {
    return {};
  }
)(GameRoom);
