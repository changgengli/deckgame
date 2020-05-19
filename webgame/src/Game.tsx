import React, { Component } from "react";
import { useDrag } from 'react-dnd'
import { Card } from './Card'
import { Hand } from './Pile'
import { Hall } from "./Hall";
import { PlayerLogin, Message, PlayerJoinGame } from "./Message";


// actions: 
// select card
// create game
// chat
// start game
// join game
// leave game
// play selected cards
// set trump color
// set trump number

interface GameState {
    selected_card_pile: string,
    selected_cards: number[], //index
    trump_color: number | undefined, // 
    trump_number: number, // 1 - 13 or joker 0 

}
interface Game {
    players: string[],
    piles: Map<string, number[]>,
    players_ready: boolean[],

}

interface Hall {
    games: Map<number, Game>

}


interface GameProps {


}

interface IState {

}


export class RootComponent extends Component<GameProps, IState>  {
    constructor(props: GameProps) {
        super(props);

        this.state = {
            articles: [
                { title: "React Redux Tutorial for Beginners", id: 1 },
                { title: "TypeScript tutorial for beginners", id: 2 }
            ]
        };
    }

    render() {
        let m = {

            kind: 'PlayerLogin',
            player: "aaaa",
        } as PlayerLogin    ;
        return (
            <div>
                <Hall
                    myId="aaa" games={[

                        {
                            gameId: 999,
                            players: ["55", undefined, undefined, undefined, undefined, undefined, undefined, undefined,  undefined, "aaa"],
                            totalPlayers: 9,
                            full: false,
                        }
                    ]}
                    messages={[m]}
                />

                <Hand
                    trumpColor={undefined} trumpNumber={undefined}
                    cards={Array.from(Array(54).keys())}
                    highlights={new Map([[0, true], [9, true]])}
                    onCardClick={(n) => console.log("selected " + n)} />;


            </div>)
    }
}

// const mapStateToProps = (state: IState) => ({
//     count: countersSelectors.getReduxCounter(state.counters),
// });

// const dispatchProps = {
//     onIncrement: countersActions.increment,
// };

// export const FCCounterConnected = connect(
//     mapStateToProps,
//     dispatchProps
// )(RootComponent);

