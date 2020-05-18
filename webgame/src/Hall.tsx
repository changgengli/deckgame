import React, { Component } from "react";
import { useDrag } from 'react-dnd'

interface GameInHall{
    gameId: number,
    players: Array<string|undefined>,
    totalPlayers: number,
    full: boolean,
}

export enum Message{
    ChatMessage,
    PlayerJoinGame,
    PlayerLogin,
    
}
interface ChatMessage{
    player: string,
    message: string,

}
interface PlayerJoinGame {
    gameId: number,
    player: string,
    position:number,
}

interface PlayerLogin {
    player: string,
}
export interface HallProps {

    games: GameInHall[],
    messages: Message[],
    myId: string,
    
}

interface GameTableProps {
    game: GameInHall,

    onJoin: (gameId: number) => void,
    
}
const GameTable : React.FunctionComponent<GameTableProps>  = (props) => {

}
const Hall: React.FunctionComponent<HallProps> = (props) => {
  

}
export {Card, CARD_BACK};
