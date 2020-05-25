import React, { useEffect, useRef, useState, MouseEvent } from "react";
import { Message } from "./Message";
import {
  HallProps,
  GameInHall,
  CreateGameProps,
  JoinGameRequest,
  CreateGameRequest,
} from "./Types";
import { connect } from "react-redux";
import { State } from "./Store";
import { send } from "@giantmachines/redux-websocket/dist";

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
  onJoin: HallProps["joinGame"];
  onLeave: HallProps["leaveGame"];
  allowJoin: boolean;
  allowLeave: boolean;
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
    Math.sin(
      ((2 * Math.PI) / props.totalPlayer) * props.postion + Math.PI / 2
    ) *
      radius +
    center;
  const yCenter =
    Math.cos(
      ((2 * Math.PI) / props.totalPlayer) * props.postion + Math.PI / 2
    ) *
      radius +
    center;

  //size of player avatar
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

  if (!props.player) {
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
    props.onJoin({
      game_id: props.game.id,
      position: selectedPosition as number,
    });
    setJoining(false);
  };

  let joinOrLeave =
    props.allowJoin &&
    existingPlayers !== props.game.players.length &&
    selectedPosition !== undefined ? (
      <div className="join">
        <button onClick={clickJoining} className="join-button">
          Join
        </button>
      </div>
    ) : props.allowLeave ? (
      <div>
        <div className="join">
          <button onClick={props.onLeave} className="join-button">
            Leave
          </button>
        </div>
      </div>
    ) : null;

  let onSelectPlayer = function (position: number) {
    setSelectedPosition(position);
  };

  return (
    <div className="game-table-outer" key={`game-table-${props.game.id}`}>
      <div className="game-table">
        <div className="top">{props.game.players.filter((x) => x).length}</div>
        <div className="bottom">{props.game.players.length}</div>
        {joinOrLeave}
      </div>
      {props.game.players.map((p, i) => (
        <GamePlayer
          player={p}
          postion={i}
          key={`player-${props.game.id}-${i}`}
          selectedIndex={selectedPosition}
          totalPlayer={props.game.players.length}
          onSelect={onSelectPlayer}
        />
      ))}
    </div>
  );
};
const CreateGame: React.FunctionComponent<CreateGameProps> = (props) => {
  let [pressed, setPressed] = useState(false);
  let [players, setPlayers] = useState(4);
  let [decks, setDecks] = useState(2);
  let [cardsToReserve, setCardsToReserve] = useState(8);

  let pressedClass = pressed ? "creating" : "normal";
  let creatingForm;
  if (pressed) {
    creatingForm = (
      <div>
        <div className="row">
          <span>Total Players (几个人)</span>
          <input
            type="number"
            min="1"
            max="11"
            value={players}
            onChange={(e) => setPlayers(parseInt(e.target.value))}
          />
        </div>
        <div className="row">
          <span>Total Decks (几副牌)</span>
          <input
            max="10"
            min="1"
            type="number"
            value={decks}
            onChange={(e) => setDecks(parseInt(e.target.value))}
          />
        </div>
        <div className="row">
          <span>Card to reserve (底牌几张)</span>
          <input
            type="number"
            max="20"
            min="0"
            value={cardsToReserve}
            onChange={(e) => setCardsToReserve(parseInt(e.target.value))}
          />
        </div>
        <div className="row">
          <button onClick={() => setPressed(false)}>Cancel</button>
          <button
            onClick={() => {
              setPressed(false);
              props.createGame({
                total_decks: decks,
                total_players: players,
                cards_to_reserve: cardsToReserve,
              });
            }}
          >
            Create
          </button>
        </div>
      </div>
    );
  } else {
    creatingForm = <div className="cross" onClick={() => setPressed(true)} />;
  }

  return <div className={`create-game ${pressedClass}`}>{creatingForm}</div>;
};
const HallPure: React.FunctionComponent<HallProps> = (props) => {
  return (
    <div className="hall">
      <div className="game-list">
        {Object.values(props.games).map((g) => (
          <GameTable
            game={g}
            onJoin={props.joinGame}
            onLeave={props.leaveGame}
            key={`game-table-${g.id}`}
            allowJoin={
              props.currentGame?.id === undefined ||
              props.currentGame?.id === null
            }
            allowLeave={props.currentGame?.id === g.id}
          />
        ))}
        {props.myId ? <CreateGame createGame={props.createGame} /> : null}
      </div>

      {/* <Messages messages={props.messages} /> */}
    </div>
  );
};

export const Hall = connect(
  (state: State /*, ownProps*/) => {
    return {
      myId: state.myId,
      games: state.hall.games,
      messages: [],
      currentGame: state.hall.currentGame,
    };
  },
  (dispatch) => {
    return {
      joinGame: (g: JoinGameRequest) =>
        dispatch(
          send({
            ...g,
            type: "JoinGame",
          })
        ),
      createGame: (g: CreateGameRequest) =>
        dispatch(
          send({
            ...g,
            type: "CreateGame",
          })
        ),
      leaveGame: () => {
        dispatch(send({ type: "LeaveGame" }));
      },
    };
  }
)(HallPure);
