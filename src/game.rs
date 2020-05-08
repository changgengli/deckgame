use crate::card::Card;
use rand::prelude::*;
use std::collections::HashMap;
use rand::seq::SliceRandom;

#[derive(Debug, Eq, PartialEq, Clone)]
pub struct Game {
    id: u32,
    players: Vec<Option<Player>>,
    total_player: u8,
    total_decks: u8,
    card_in_reserve_pile: u8,
    pile_to_cards: HashMap<Pile, Vec<Card>>,
}

fn gen_game_id() -> u32 {
    let mut rng = thread_rng();
    rng.gen_range(1000000,9999999)
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
        }
        (0..total_player).for_each(|player| {
            piles_to_cards.insert(Pile::Hand(player), Vec::new());
            piles_to_cards.insert(Pile::DiscardPile(player), Vec::new());
            piles_to_cards.insert(Pile::ClaimPile(player), Vec::new());
            piles_to_cards.insert(Pile::ScorePile(player), Vec::new());
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

}

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
    DrawPile,        // shared
    ReservedPile,    //shared
    HiddenBuryPile,  //shared
    VisibleBuryPile, // shared
    SharedScorePile,
}

pub enum PlayerAction {
    Draw(Player, Pile), // Destination to Hand
    Call(Player, Card), // Hand to Public Discard Pile
    Score,              //public discard to score
    MergeScore(Player), // Score to share score
    UndoScore,          // score or share score to public discard pile
    TakeBack,           // Discard pile to Hand
}
