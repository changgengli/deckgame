use crate::card;
use crate::game;
use std::collections::HashMap;

use serde::{Deserialize, Serialize};
#[derive(Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Request {
    Login {
        id: String,
        password: String,
    },
    JoinGame {
        game_id: u32,
        position: u8,
    },
    CreateGame {
        total_decks: u8,
        total_players: u8,
        cards_to_reserve: u16,
    },
    LeaveGame,
    Ping,
    Hall,
    Game,
    Chat {
        message: String,
    },
    StartGame,
    MoveCard {
        source: game::Pile,
        destination: game::Pile,
        cards: Vec<card::Card>,
    },

    MoveAllCard {
        source: game::Pile,
        destination: game::Pile,
    },
}

#[derive(Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Response {
    Pong,
    LoginSuccess {
        id: String,
    },
    BadMessage {
        message: String,
    },
    Hall {
        players: Vec<String>,
        games: Vec<Game>,
    },

    GameInHall {
        id: u32,
        players: Vec<Option<String>>,
        total_decks: u8,
        cards_to_reserve: u16,
    },

    PlayerJoinedGame {
        player: String,
        game_id: u32,
        position: u8,
    },
    PlayerLeftGame {
        player: String,
        game_id: u32,
    },

    GameStart,
    GameReady,
    MoveCard {
        position: u8,
        source: game::Pile,
        destination: game::Pile,
        cards: Vec<card::Card>,
    },

    HiddenMoveCard {
        position: u8,
        source: game::Pile,
        destination: game::Pile,
        total_cards: u16,
    },
    Chat {
        player_id: String,
        message: String,
    },

    FullGame {
        position: u8,
        game: Game,
        card_counts: HashMap<game::Pile, u16>,
        piles_cards: HashMap<game::Pile, Vec<card::Card>>,
        players_ready: Vec<bool>,
    },

    PlayerReady {
        position: u8,
        game_id: u32,
    },
}

#[derive(Serialize, Deserialize)]
pub struct Game {
    pub id: u32,
    pub players: Vec<Option<String>>,
    pub total_decks: u8,
    pub cards_to_reserve: u16,
}
