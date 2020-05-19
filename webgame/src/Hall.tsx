
import React, { useEffect, useRef, useState } from 'react'


interface GameInHall {
    gameId: number,
    players: Array<string | undefined>,
    totalPlayers: number,
    full: boolean,
}

export enum Message {
    ChatMessage,
    PlayerJoinGame,
    PlayerLogin,

}
interface ChatMessage {
    player: string,
    message: string,

}
interface PlayerJoinGame {
    gameId: number,
    player: string,
    position: number,
}

interface PlayerLogin {
    player: string,
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
        )
    }


interface GameTableProps {
    game: GameInHall,

    onJoin: (gameId: number) => void,

}
const GameTable: React.FunctionComponent<GameTableProps> = (props: GameTableProps) => {
    const [joining, setJoining] = useState(false);

    if (props.game.totalPlayers === props.game.players.length) {
        setJoining(false);
    }

    let clickJoining = function () {
        props.onJoin(props.game.gameId);
        setJoining(false);
    }
    let join = joining ? <div className="join-button">
        <button onClick={clickJoining}>Join</button>
    </div> : null;


    return
    <div className="game-table">
        <div className="top">
            {props.game.players.length}
        </div>
        <div className="bottom">
            {props.game.totalPlayers}
        </div>
        {join}
    </div>;

}
const Hall: React.FunctionComponent<HallProps> = (props) => {
    let joinGame = function (game_id: number) {
        props.myId;
    };
    return
    <div className="hall">
        <div className="game-list">
            {props.games.map(g => <GameTable
                game={g} onJoin={joinGame}
            />)}
        </div>

        <Messages messages={props.messages} />
    </div>
        ;
}
export { Card, CARD_BACK };
