use serde::{Deserialize, Serialize};
use crate::game;
#[derive(Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Request {
 Login{id:String, password: String},
 JoinGame{game_id:u32,  position: u8},
 CreateGame{total_decks: u8, total_players: u8, cards_to_reserve: u8},
 LeaveGame,
 Ping,

 Hall,

}

#[derive(Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Response {
   Pong,
   BadMessage{message: String},
   Hall{
       players: Vec<String>,
       games: Vec<Game>,
   }
}

#[derive(Serialize, Deserialize)]
pub struct Game {
    pub id: u32,
    pub players: Vec<Option<String>>,    
}

