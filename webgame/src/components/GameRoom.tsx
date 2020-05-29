import React, { useState, MouseEvent } from "react";
import { State, GameState, PileState, ItemTypes } from "../Store";
import { connect } from "react-redux";
import { send } from "@giantmachines/redux-websocket";
import { Card, CardProps, Cardback } from "../Card";
import { CLICK_CARD, ClickCardAction } from "../Actions";
import {
  DndProvider,
  useDrop,
  DragSource,
  DragSourceSpec,
  DragSourceMonitor,
  DragSourceCollector,
  DragSourceConnector,
} from "react-dnd";
import HTML5Backend from "react-dnd-html5-backend";

type clickPileCard = (pile: string, index: number, value: number) => void;

const HiddlePile: React.FunctionComponent<{
  pile: PileState;
  title: string;
}> = ({ pile, title }) => {
  return (
    <div className="hidden-pile">
      <div className="title">
        {title}
        {pile.count === 0 ? "" : `·${pile.count}`}
      </div>
      <div className="card-list">
        {Array(pile.count)
          .fill(1)
          .map((_, i) => (
            <Cardback index={i} key={`${pile.name}-${i}`} total={pile.count} />
          ))}
      </div>
    </div>
  );
};

interface PileProps {
  pile: PileState;
  clickCard: clickPileCard;
  title: string;
}
const VisiblePile: React.FunctionComponent<PileProps> = ({
  pile,
  clickCard,
  title,
}) => {
  // const [, drop] = useDrop({
  //   accept: ItemTypes.CARD,
  //   drop: () => moveKnight(x, y),
  // });

  return (
    <div className="visible-pile">
      <div className="tile">{title}</div>

      <div className="card-list">
        {pile.cards.map((c, i) => (
          <Card
            key={`${pile.name}-${i}`}
            index={i}
            value={c.value}
            highlight={c.selected}
            fullSize={true}
            onClick={(index, value) => clickCard(pile.name, index, value)}
            nonOverLap={25}
          ></Card>
        ))}
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

  const xCenter =
    Math.sin((Math.PI / props.totalPlayer) * relativePostion) * radius + center;
  const yCenter =
    -1 * Math.cos((Math.PI / props.totalPlayer) * relativePostion) * radius +
    center;

  //size of player avatar
  const xSide = 40;
  const ySide = 40;
  const x = xCenter - xSide / 2;
  const y = yCenter - ySide / 2;

  const style = { top: x, left: y };
  let className = "player";
  let player = props.player ?? "<disconnected>";
  let position = props.position;
  return (
    <div className={className} style={style}>
      <div className="head">
        <div className="avatar" />
        <div className="name">
          {player}-{props.position}
        </div>
        <div className="check">
          {props.readyForNextGame ? <span>☑</span> : <span>▶</span>}
        </div>
      </div>
      <div className="piles">
        <HiddenPileContainer
          title={`${player}·手牌`}
          name={`hand#${position}`}
        />

        <VisiblePileContainer
          title={`${player}·得分`}
          name={`score_pile#${position}`}
        />

        <VisiblePileContainer
          title={`${player}·出牌`}
          name={`discard_pile#${position}`}
        />

        <HiddenPileContainer
          title={`${player}·扣牌`}
          name={`hidden_bury_pile#${position}`}
        />
      </div>
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
    <div className={`me`}>
      <div className="head">
        <div className="avatar" onClick={onClickReady} />
        <div className="name" onClick={onClickReady}>
          {name}
        </div>
        <div className="check" onClick={onClickReady}>
          {readyForNextGame ? (
            <span data-tooltip="Waiting for other players to start">☑</span>
          ) : (
            <span data-tooltip="Click to start next game">▶</span>
          )}
        </div>
      </div>
      <div className="piles">
        <VisiblePileContainer title={`手牌`} name={`hand#${position}`} />

        <VisiblePileContainer title={`得分`} name={`score_pile#${position}`} />

        <VisiblePileContainer
          title={`出牌`}
          name={`discard_pile#${position}`}
        />

        <HiddenPileContainer
          title={`扣牌`}
          name={`hidden_bury_pile#${position}`}
        />
      </div>
    </div>
  );
};
const GameRoom: React.FunctionComponent<{
  game: GameState;
}> = ({ game }) => {
  const [id, setId] = useState("");
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="game-window">
        <div className="game-room-outer">
          <div className="game-room">
            <div className="player-list">
              {game.players
                .filter((_, index) => index !== game.position)
                .map((player, index) => {
                  return <GamePlayerContainer position={index} />;
                })}
            </div>
            <div className="center">
              <VisiblePileContainer title="得分" name="shared_score_pile" />
              <HiddenPileContainer title="底牌" name="reserved_pile" />
              <HiddenPileContainer title="牌堆" name="draw_pile" />
            </div>
            <MeContainer />
          </div>
        </div>
        <div className="messages"></div>
      </div>
    </DndProvider>
  );
};

interface PileDragObject {
  pile: string;
  cards: number[];
}
let pileSource: DragSourceSpec<PileProps, PileDragObject> = {
  beginDrag(props: PileProps) {
    // Return the data describing the dragged item
    return {
      pile: props.pile.name,
      cards: props.pile.cards.filter((c) => c.selected).map((c) => c.value),
    };
  },

  endDrag(props: PileProps, monitor: DragSourceMonitor, component: any) {
    if (!monitor.didDrop()) {
      return;
    }

    // // When dropped on a compatible target, do something
    const item = monitor.getItem();
    const dropResult = monitor.getDropResult();
    console.log("drop from ", item, dropResult);
    //TODO dispatch move card message
    // CardActions.moveCardToList(item.id, dropResult.listId)
  },

  canDrag(props: PileProps, monitor: DragSourceMonitor) {
    return props.pile.cards.filter((c) => c.selected).length !== 0;
  },
};

//  DragSourceCollector<CollectedProps, TargetProps> =
// (connect: DragSourceConnector, monitor: DragSourceMonitor, props: TargetProps) => CollectedProps;

let pileCollect: DragSourceCollector<CollectedProps, RequiredProps> = (
  connect: DragSourceConnector,
  monitor: DragSourceMonitor,
  props: any
) => {
  return {
    connectDragSource: connect.dragSource,
    connect,
  };
};

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
    };
  }
)(DragSource(ItemTypes.PILE, pileSource, pileCollect)(VisiblePile));

const HiddenPileContainer = connect(
  (state: State, props: { name: string; title: string }) => {
    return {
      title: props.title,
      pile: state.game?.piles[props.name] as PileState,
    };
  }
)(HiddlePile);
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
