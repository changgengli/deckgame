import React, { useEffect, useRef, useState, MouseEvent } from "react";
import { PlayerLogin, Message } from "./Message";
import { HallProps } from "./Types";
import { connect } from "react-redux";
import { State } from "./Store";
export interface GameInHall {
  gameId: number;
  players: Array<string | undefined>;
  totalPlayers: number;
  full: boolean;
}
const Messages: React.FunctionComponent<{
  messages: Array<Message>;
}> = (props: { messages: Array<Message> }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [props.messages]);
  return (
    <div>
      {props.messages.map((message) => (
        <div>message </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

interface GameTableProps {
  game: GameInHall;
  onJoin: (gameId: number) => void;
}

interface GamePlayerProps {
  player: string | undefined;
  postion: number;
  selectedIndex: number | undefined;
  totalPlayer: number;
  onSelect: (position: number) => void;
}

const GamePlayer: React.FunctionComponent<GamePlayerProps> = (
  props: GamePlayerProps
) => {
  // compute top and left
  const radius = 120;
  const center = 151;
  const xCenter =
    Math.sin(((2 * Math.PI) / props.totalPlayer) * props.postion) * radius +
    center;
  const yCenter =
    Math.cos(((2 * Math.PI) / props.totalPlayer) * props.postion) * radius +
    center;

  const xSide = 40;
  const ySide = 40;
  const x = xCenter - xSide / 2;
  const y = yCenter - ySide / 2;

  const style = { top: x, left: y };
  let className = "player";
  let onClick = undefined;
  let player = null;
  if (props.selectedIndex === props.postion) {
    className += " selected";
  }

  if (props.player === undefined) {
    onClick = (event: MouseEvent<HTMLDivElement>) =>
      props.onSelect(props.postion);
    className += " player-empty";
  } else {
    player = props.player;
  }

  return (
    <div className={className} style={style} onClick={onClick}>
      <div className="avatar" />
      <div className="name">{player}</div>
    </div>
  );
};

// Game table in hall
const GameTable: React.FunctionComponent<GameTableProps> = (
  props: GameTableProps
) => {
  const [joining, setJoining] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<number | undefined>(
    undefined
  );

  let existingPlayers = props.game.players.filter((x) => x).length;

  let clickJoining = function () {
    props.onJoin(props.game.gameId);
    setJoining(false);
  };

  let join =
    existingPlayers !== props.game.totalPlayers &&
    selectedPosition !== undefined ? (
      <div className="join">
        <button onClick={clickJoining} className="join-button">
          Join
        </button>
      </div>
    ) : null;

  let onSelectPlayer = function (position: number) {
    setSelectedPosition(position);
  };

  return (
    <div className="game-table-outer">
      <div className="game-table">
        <div className="top">{props.game.players.filter((x) => x).length}</div>
        <div className="bottom">{props.game.totalPlayers}</div>
        {join}
      </div>
      {props.game.players.map((p, i) => (
        <GamePlayer
          player={p}
          postion={i}
          selectedIndex={selectedPosition}
          totalPlayer={props.game.players.length}
          onSelect={onSelectPlayer}
        />
      ))}
    </div>
  );
};

const HallPure: React.FunctionComponent<HallProps> = (props) => {
  let joinGame = function (game_id: number) {
    // props.myId;
    // todo send message to server and enter the game UI.
  };
  return (
    <div className="hall">
      <div className="game-list">
        {props.games.map((g) => (
          <GameTable game={g} onJoin={joinGame} />
        ))}
      </div>
      <Messages messages={props.messages} />
    </div>
  );
};

const mapStateToProps = (state: State /*, ownProps*/): HallProps => {
  return {
    myId: "aaa",
    games: [
      {
        gameId: 999,
        players: [
          "55",
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          "aaa",
        ],
        totalPlayers: 9,
        full: false,
      },
      {
        gameId: 999,
        players: [
          "55",
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          "aaa",
        ],
        totalPlayers: 9,
        full: false,
      },
    ],
    messages: [
      {
        kind: "PlayerLogin",
        player: "aaaa",
      } as PlayerLogin,
    ],
  };
};

const mapDispatchToProps = {};
export const Hall = connect(mapStateToProps, mapDispatchToProps)(HallPure);
