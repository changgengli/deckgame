import React, { useState, MouseEvent } from "react";
import { State, GameState, PileState } from "../Store";
import { connect } from "react-redux";
import { send } from "@giantmachines/redux-websocket";
import { Card, CardProps, Cardback } from "../Card";

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
const VisiblePile: React.FunctionComponent<{
  pile: PileState;
  clickCard: clickPileCard;
  title: string;
}> = ({ pile, clickCard, title }) => {
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
            nonOverLap={10}
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
  hand: PileState;
  discard: PileState;
  score: PileState;
  bury: PileState;
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
        <HiddlePile title={`${player}·手牌`} pile={props.hand} />

        <VisiblePile
          clickCard={() => {}}
          title={`${player}·得分`}
          pile={props.score}
        />

        <VisiblePile
          clickCard={() => {}}
          title={`${player}·出牌`}
          pile={props.discard}
        />

        <HiddlePile title={`${player}·扣牌`} pile={props.bury} />
      </div>
    </div>
  );
};

const Me: React.FunctionComponent<{
  name: string;
  onClickReady: () => void;
  readyForNextGame: boolean;
  hand: PileState;
  discard: PileState;
  score: PileState;
  bury: PileState;
}> = ({ onClickReady, name, readyForNextGame, hand, discard, score, bury }) => {
  return (
    <div className={`me`} onClick={onClickReady}>
      <div className="head">
        <div className="avatar" />
        <div className="name">{name}</div>
        <div className="check">
          {readyForNextGame ? (
            <span data-tooltip="Waiting for other players to start">☑</span>
          ) : (
            <span data-tooltip="Click to start next game">▶</span>
          )}
        </div>
      </div>
      <div className="piles">
        <VisiblePile clickCard={() => {}} title={`手牌`} pile={hand} />

        <VisiblePile title={`得分`} pile={score} clickCard={() => {}} />

        <VisiblePile title={`出牌`} pile={discard} clickCard={() => {}} />

        <HiddlePile title={`扣牌`} pile={bury} />
      </div>
    </div>
  );
};
const GameRoom: React.FunctionComponent<{
  game: GameState;
}> = ({ game }) => {
  const [id, setId] = useState("");
  return (
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
            <VisiblePile
              title="得分"
              pile={game.piles["shared_score_pile"]}
              clickCard={() => {}} // TODO
            />
            <HiddlePile title="底牌" pile={game.piles["reserved_pile"]} />
            <HiddlePile title="牌堆" pile={game.piles["draw_pile"]} />
          </div>
          <MeContainer />
        </div>
      </div>
      <div className="messages"></div>
    </div>
  );
};

const MeContainer = connect(
  (state: State) => {
    let game = state.game as GameState;
    let position = game.position;
    return {
      name: game.players[position] as string,
      postion: position,
      currentPlayerPosition: game.position,
      hand: game.piles[`hand#${position}`],
      score: game.piles[`score_pile#${position}`],
      totalPlayer: game.players.length,
      readyForNextGame: game.players_ready[position],
      discard: game.piles[`discard_pile#${position}`],
      bury: game.piles[`hidden_bury_pile#${position}`],
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
