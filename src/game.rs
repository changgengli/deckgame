use crate::card::Card;
use crate::error;
use rand::prelude::*;
use rand::seq::SliceRandom;
use std::collections::HashMap;
use std::mem;
use std::rc::Rc;
use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc,
};

use tokio::sync::{mpsc, Mutex, RwLock};

use warp::ws::{Message, WebSocket};

pub enum GameState {
    WaitingForPlayer,
    ReadyToStart,
    Dealing,
    DealingEnd,
    Playing,
    PlayingEnd,
}
type TX = mpsc::UnboundedSender<Result<Message, warp::Error>>;

#[derive(Debug)]
pub struct Player {
    pub id: String,
    pub password: String,
    pub tx: TX,

}
impl Player {
    pub fn can_be_replaced(&self, another: &Player) -> bool {
        return self.id == another.id && self.password == another.password;
    }

}

pub enum PlayerState {
    Offline,
    Normal,
    Disconnected,
}

#[derive(Debug, Eq, PartialEq, Copy, Clone, Hash)]
pub enum Pile {
    Hand(u8),
    DiscardPile(u8),
    ScorePile(u8),
    ClaimPile(u8),
    HiddenBuryPile(u8),
    DrawPile,        // shared
    ReservedPile,    //shared
    VisibleBuryPile, // shared
    SharedScorePile,
}

impl Pile {
    pub fn allow_player(&self, player_index: u8) -> bool {
        match self {
            Pile::Hand(p)
            | Pile::DiscardPile(p)
            | Pile::ScorePile(p)
            | Pile::ClaimPile(p)
            | Pile::HiddenBuryPile(p) => *p == player_index,
            Pile::ReservedPile | Pile::VisibleBuryPile | Pile::SharedScorePile => true,
            Pile::DrawPile => false,
        }
    }
}

#[derive(Debug, Eq, PartialEq, Clone, Hash)]
pub enum PlayerAction {
    Login(String,String),
    NewGame(u8, u8, u8), 
    Enter(u8),              // game id
    Join(),                 //position
    Move(Card, Pile, Pile), // Card, from, to,
}

#[derive(Debug)]
pub struct Game {
    id: u32,
    players: Vec<Option<Arc<Player>>>,
    total_players: u8,
    total_decks: u8,
    cards_in_reserve_pile: u8,
    pile_to_cards: HashMap<Pile, Vec<Card>>,
}


#[derive(Debug)]
pub struct GameForPlayer<'a> {
    id: &'a u32,
    players: &'a Vec<Option<Arc<Player>>>,
    total_players: &'a u8,
    total_decks: &'a u8,
    cards_in_reserve_pile: &'a u8,
    pile_to_cards: HashMap<&'a Pile, &'a Vec<Card>>,
}

fn gen_game_id() -> u32 {
    let mut rng = thread_rng();
    rng.gen_range(1000000, 9999999)
}

fn shuffle(cards: &mut Vec<Card>) {
    let mut rng = thread_rng();
    cards.shuffle(&mut rng)
}

impl Game {
    pub fn get_game_id (&self) -> u32 {
        self.id
    }
    pub fn new(total_players: u8, total_decks: u8, cards_in_reserve_pile: u8) -> Game {
        let mut all_cards: Vec<Card> = (0..4).flat_map(|_x| Card::generate_deck(true)).collect();
        shuffle(&mut all_cards);

        let mut piles_to_cards: HashMap<Pile, Vec<Card>> = HashMap::new();
        {
            let mut draw_cards: Vec<Card> = Vec::new();
            (0..total_decks * 54 - cards_in_reserve_pile).for_each(|_x| {
                draw_cards.push(all_cards.pop().unwrap());
            });
            piles_to_cards.insert(Pile::DrawPile, draw_cards);
            piles_to_cards.insert(Pile::ReservedPile, all_cards);
            piles_to_cards.insert(Pile::VisibleBuryPile, Vec::new());
            piles_to_cards.insert(Pile::SharedScorePile, Vec::new());
        }
        (0..total_players).for_each(|player| {
            piles_to_cards.insert(Pile::Hand(player), Vec::new());
            piles_to_cards.insert(Pile::DiscardPile(player), Vec::new());
            piles_to_cards.insert(Pile::ClaimPile(player), Vec::new());
            piles_to_cards.insert(Pile::ScorePile(player), Vec::new());
            piles_to_cards.insert(Pile::HiddenBuryPile(player), Vec::new());
        });

        Game {
            id: gen_game_id(),
            players: (0..total_players).map(|_x| Option::None).collect(),
            total_decks: total_decks,
            total_players: total_players,
            cards_in_reserve_pile: cards_in_reserve_pile,
            pile_to_cards: piles_to_cards,
        }
    }

    pub fn gen_game_for_player<'a>(&'a self, index: u8) -> GameForPlayer {
        let mut piles_to_card: HashMap<&Pile, &Vec<Card>> = HashMap::new();

        self.pile_to_cards
            .iter()
            .filter(|&(k, v)| match k {
                Pile::HiddenBuryPile(player) => *player == index,
                Pile::VisibleBuryPile => true, // shared
                Pile::SharedScorePile => true,
                Pile::Hand(player) => *player == index,
                Pile::DiscardPile(_player) => true,
                Pile::ScorePile(_player) => true,
                Pile::ClaimPile(_player) => true,
                Pile::DrawPile => false,
                Pile::ReservedPile => false, //shared
            })
            .for_each(|(k, v)| {
                piles_to_card.insert(&k, &v);
            });

        GameForPlayer {
            id: &self.id,
            players: &self.players,
            total_players: &self.total_players,
            total_decks: &self.total_decks,
            cards_in_reserve_pile: &self.cards_in_reserve_pile,
            pile_to_cards: piles_to_card,
        }
    }

    fn move_card(&mut self, from: Pile, to: Pile, card: Card) -> error::Result<()> {
        if !self.pile_to_cards.contains_key(&from) {
            return Result::Err(error::GameError::InvalidPile(from));
        }

        if !self.pile_to_cards.contains_key(&to) {
            return Result::Err(error::GameError::InvalidPile(to));
        }
        let from_pile = self.pile_to_cards.get_mut(&from).unwrap();

        if let Some(index) = from_pile.iter().rev().position(|&c| c == card) {
            // oder doesn't matter here
            from_pile.swap_remove(index);
        } else {
            return Result::Err(error::GameError::InvalidCard(card));
        }

        let to_pile = self.pile_to_cards.get_mut(&to).unwrap();
        to_pile.push(card);

        Result::Ok(())
    }

    pub fn player_join(
        &mut self,
        player: Arc<Player>,
        position: u8,
    ) -> error::Result<()> {
        if let Some(existing_player) = self.players.get(usize::from(position)) {
            // if let Some(occupied) = existing_player {
            //     if !occupied.can_be_replaced(&player) {
            //         return Result::Err(error::GameError::PositionOccupied(position));
            //     }
            // }
            self.players[usize::from(position)] = Some(player);
            return Result::Ok(());
        }

        Result::Err(error::GameError::InvalidPosition(position))
    }

    pub fn handle_player_move_action(
        mut self,
        player: &Player,
        action: PlayerAction,
    ) -> error::Result<()> {
        use PlayerAction::*;

        match action {
            Move(card, from, to) => {
                // valid if the player is in game
                let position = self.get_player_position(&player) as u8;
                if from.allow_player(position) && to.allow_player(position) {
                    self.move_card(from, to, card);
                    Result::Ok(())
                } else {
                    Result::Err(error::GameError::NotAllowed)
                }
            }

            _ => Result::Err(error::GameError::InvalidPlayerCommand(action)),
        }
    }

    fn get_player_position(&self, player: &Player) -> usize{
        self.players.iter().position( |e| {

            match e {
                Some(p) => 
                    p.id == player.id
                ,
                None => false,
            }
        }).unwrap()
    }

    pub fn remove_player(&mut self, player: &Arc<Player>) {
        let position = self.get_player_position(player);
        
        self.players.get_mut(position).take();
    }
    
}

pub type GameInHall = Arc<RwLock<Game>>;
pub struct Hall {
    players: HashMap<String, Arc<Player>>,
    games: HashMap<u32, GameInHall>,
}

impl Hall{
    pub fn new () -> Hall {
        Hall {
            players: HashMap::new(),
            games: HashMap::new(),
        }
    }
    pub fn get_game(& self, game_id: u32) -> Option<GameInHall> {

        return self.games.get(&game_id).cloned();
    }
    pub fn add_player(&mut self, player: Arc<Player>){
        self.players.insert(player.id.clone(), player);
    }

    pub fn remove_player(&mut self, id: &String) {
        self.players.remove(id);
    }
    
    pub fn add_game(&mut self, game_id: u32,game: GameInHall){
        self.games.insert(game_id, game);
    }
    
    pub fn remove_game(&mut self, id: u32){
        self.games.remove(&id);
    }
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pile() {
        assert!(!Pile::DrawPile.allow_player(0));
        assert!(Pile::ClaimPile(0).allow_player(0));
        assert!(!Pile::ClaimPile(0).allow_player(1));
        assert!(Pile::SharedScorePile.allow_player(0));
    }
    #[test]
    fn test_move_card() {
        let mut game = Game::new(2, 1, 0);
        println!("{:?}", game);
        game.move_card(
            Pile::DrawPile,
            Pile::Hand(0),
            game.pile_to_cards.get(&Pile::DrawPile).unwrap()[0],
        )
        .unwrap();
        println!("{:?}", game);
    }
}

