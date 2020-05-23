use crate::game::Game;
use crate::{message, player::Player};

use std::collections::hash_map::Iter;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

pub type GameInHall = Arc<RwLock<Game>>;
#[derive(Debug)]

pub struct Hall {
    players: HashMap<String, Arc<Player>>,
    games: HashMap<u32, GameInHall>,
}

impl Hall {
    pub fn new() -> Hall {
        Hall {
            players: HashMap::new(),
            games: HashMap::new(),
        }
    }
    pub fn get_game(&self, game_id: u32) -> Option<GameInHall> {
        return self.games.get(&game_id).cloned();
    }
    pub fn add_player(&mut self, player: Arc<Player>) {
        self.players.insert(player.id.clone(), player);
    }

    pub fn remove_player(&mut self, id: &String) {
        self.players.remove(id);
    }

    pub fn add_game(&mut self, game_id: u32, game: GameInHall) {
        self.games.insert(game_id, game);
    }

    pub fn remove_game(&mut self, id: u32) {
        self.games.remove(&id);
    }

    pub fn iter_games(&self) -> Iter<u32, GameInHall> {
        self.games.iter()
    }

    pub fn iter_players(&self) -> Iter<String, Arc<Player>> {
        self.players.iter()
    }

    pub fn has_player(&self, id: &String) -> bool {
        self.players.contains_key(id)
    }
    pub fn broadcast_game(&self, game: &Game) {
        let g = game.gen_game_message();
        let message = message::Response::GameInHall {
            id: g.id,
            players: g.players,
            total_decks: g.total_decks,
            cards_to_reserve: g.cards_to_reserve,
        };
        self.players.iter().for_each(|(_, p)| {
            p.send_message(&message);
        });
    }
}
