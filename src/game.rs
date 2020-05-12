use crate::card::Card;
use crate::error;
use rand::prelude::*;
use rand::seq::SliceRandom;
use std::collections::HashMap;
use std::mem;

pub enum GameState {
    WaitingForPlayer,
    ReadyToStart,
    Dealing,
    DealingEnd,
    Playing,
    PlayingEnd,
}

#[derive(Debug, Eq, PartialEq, Clone, Ord, PartialOrd, Hash)]
pub struct Player {
    id: String,
    password: String,
    index: u8,
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
    players: Vec<Option<Player>>,
    total_player: u8,
    total_decks: u8,
    card_in_reserve_pile: u8,
    pile_to_cards: HashMap<Pile, Vec<Card>>,
}


#[derive(Debug)]
pub struct GameForPlayer<'a> {
    id: &'a u32,
    players: &'a Vec<Option<Player>>,
    total_player: &'a u8,
    total_decks: &'a u8,
    card_in_reserve_pile: &'a u8,
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
    pub fn new(total_player: u8, total_decks: u8, card_in_reserve_pile: u8) -> Game {
        let mut all_cards: Vec<Card> = (0..4).flat_map(|_x| Card::generate_deck(true)).collect();
        shuffle(&mut all_cards);

        let mut piles_to_cards: HashMap<Pile, Vec<Card>> = HashMap::new();
        {
            let mut draw_cards: Vec<Card> = Vec::new();
            (0..total_decks * 54 - card_in_reserve_pile).for_each(|_x| {
                draw_cards.push(all_cards.pop().unwrap());
            });
            piles_to_cards.insert(Pile::DrawPile, draw_cards);
            piles_to_cards.insert(Pile::ReservedPile, all_cards);
            piles_to_cards.insert(Pile::VisibleBuryPile, Vec::new());
            piles_to_cards.insert(Pile::SharedScorePile, Vec::new());
        }
        (0..total_player).for_each(|player| {
            piles_to_cards.insert(Pile::Hand(player), Vec::new());
            piles_to_cards.insert(Pile::DiscardPile(player), Vec::new());
            piles_to_cards.insert(Pile::ClaimPile(player), Vec::new());
            piles_to_cards.insert(Pile::ScorePile(player), Vec::new());
            piles_to_cards.insert(Pile::HiddenBuryPile(player), Vec::new());
        });

        Game {
            id: gen_game_id(),
            players: (0..total_player).map(|_x| Option::None).collect(),
            total_decks: total_decks,
            total_player: total_player,
            card_in_reserve_pile: card_in_reserve_pile,
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
            total_player: &self.total_player,
            total_decks: &self.total_decks,
            card_in_reserve_pile: &self.card_in_reserve_pile,
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

    pub fn handle_player_join_action(
        mut self,
        player: Player,
        action: PlayerAction,
    ) -> error::Result<()> {
        let position = player.index;

        if let Some(existing_player) = self.players.get(usize::from(position)) {
            if let Some(occupied) = existing_player {
                if !occupied.can_be_replaced(&player) {
                    return Result::Err(error::GameError::PositionOccupied(position));
                }
            }

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

                if from.allow_player(player.index) && to.allow_player(player.index) {
                    self.move_card(from, to, card);
                    Result::Ok(())
                } else {
                    Result::Err(error::GameError::NotAllowed)
                }
            }

            _ => Result::Err(error::GameError::InvalidPlayerCommand(action)),
        }
    }
}

struct Hall {
    players: HashMap<String, Player>,
    games: HashMap<usize, Game>,

}

impl Hall{
    pub fn new_game() {

    }

    fn login(&mut self,  id: String, password: String) -> error::Result<()>{
        // if self.players.contains_key(&username) {
        //     let existing_player =
        //     return Result::Err("Duplicat")
        // }
    
        let id_copy = id.clone();
        let player = Player{
            id: id,
            password: password,
            index: 0,
        };
        
        self.players.insert(id_copy, player);
        Result::Ok(())

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

