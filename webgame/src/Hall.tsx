
import React, { useEffect, useRef, useState } from 'react'
import { ChatMessage, PlayerJoinGame, PlayerLogin, Message } from './Message';

export interface GameInHall {
    gameId: number,
    players: Array<string | undefined>,
    totalPlayers: number,
    full: boolean,
}

export interface HallProps {
    games: GameInHall[],
    messages: Message[],
    myId: string,
}

const Messages: React.FunctionComponent<{ messages: Array<Message> }> =
    (props: { messages: Array<Message> }) => {
        const messagesEndRef = useRef<HTMLDivElement>(null)
        const scrollToBottom = () => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        }
        useEffect(scrollToBottom, [props.messages]);
        return (
            <div>
                {props.messages.map(message => <div>message </div>)}
                <div ref={messagesEndRef} />
            </div>
        );
    }


interface GameTableProps {
    game: GameInHall,
    onJoin: (gameId: number) => void,
}

const GameTable: React.FunctionComponent<GameTableProps> = (props: GameTableProps) => {
    const [joining, setJoining] = useState(false);

        // if (props.game.totalPlayers === props.game.players.length) {
        //     setJoining(false);
        // }

    let clickJoining = function () {
        props.onJoin(props.game.gameId);
        setJoining(false);
    }
    let join = props.game.players.filter(x=>x).length === props.game.totalPlayers ?null: <div className="join-button">
        <button onClick={clickJoining}>Join</button>
    </div> ;

    return (
        <div className="game-table">
            <div className="top">
                {props.game.players.filter(x=>x).length}
            </div>
            <div className="bottom">
                {props.game.totalPlayers}
            </div>
            {join}
        </div>);

}
const Hall: React.FunctionComponent<HallProps> = (props) => {
    let joinGame = function (game_id: number) {
        // props.myId;
    };
    return (
        <div className="hall">
            <div className="game-list">
                {props.games.map(g => <GameTable game={g} onJoin={joinGame} />)}
            </div>
            <Messages messages={props.messages} />
        </div>);
}
export { Hall };
