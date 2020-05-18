use crate::card::Card;
use crate::error;
use crate::message::Response::*;
use crate::player::Player;
use rand::prelude::*;
use rand::seq::SliceRandom;
use serde::{Deserialize, Serialize, Serializer};
use std::collections::HashMap;
use std::sync::Arc;
#[derive(Debug, Eq, PartialEq, Copy, Clone, Hash, Deserialize)]
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

impl Serialize for Pile {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        use Pile::*;
        let s = match *self {
            Hand(p) => format!("hand_{}", p),
            DiscardPile(p) => format!("discard_pile_{}", p),
            ScorePile(p) => format!("score_pile_{}", p),
            ClaimPile(p) => format!("claim_piple_{}", p),
            HiddenBuryPile(p) => format!("hidden_bury_pile_{}", p),
            DrawPile => "draw_pile".to_owned(),
            ReservedPile => "reserved_piple".to_owned(), //shared
            VisibleBuryPile => "visible_bury_pile".to_owned(),
            SharedScorePile => "shared_score_pile".to_owned(),
        };
        serializer.serialize_str(&s)
    }
}

impl Pile {
    pub fn allow_player_move_from(&self, position: u8) -> bool {
        match self {
            Pile::Hand(p)
            | Pile::DiscardPile(p)
            | Pile::ScorePile(p)
            | Pile::ClaimPile(p)
            | Pile::HiddenBuryPile(p) => *p == position,
            Pile::ReservedPile | Pile::VisibleBuryPile | Pile::SharedScorePile => true,
            Pile::DrawPile => false,
        }
    }
    pub fn allow_player_move_to(&self, position: u8) -> bool {
        match self {
            Pile::Hand(p)
            | Pile::DiscardPile(p)
            | Pile::ScorePile(p)
            | Pile::ClaimPile(p)
            | Pile::HiddenBuryPile(p) => *p == position,
            Pile::ReservedPile | Pile::VisibleBuryPile | Pile::SharedScorePile => true,
            Pile::DrawPile => false,
        }
    }

    // as a destination or source whether this pile is hidden from other people
    pub fn is_hidden(&self) -> bool {
        match self {
            Pile::Hand(_) | Pile::HiddenBuryPile(_) | Pile::ReservedPile | Pile::DrawPile => true,
            Pile::VisibleBuryPile
            | Pile::SharedScorePile
            | Pile::DiscardPile(_)
            | Pile::ScorePile(_)
            | Pile::ClaimPile(_) => false,
        }
    }

    pub fn visible_to_player(&self, position: u8) -> bool {
        match self {
            Pile::Hand(p) | Pile::HiddenBuryPile(p) => *p == position,

            Pile::DiscardPile(_)
            | Pile::ScorePile(_)
            | Pile::ClaimPile(_)
            | Pile::VisibleBuryPile
            | Pile::SharedScorePile => true,
            Pile::ReservedPile | Pile::DrawPile => false,
        }
    }
}

#[derive(Debug)]
pub struct Game {
    id: u32,
    players: Vec<Option<Arc<Player>>>,
    total_players: u8,
    total_decks: u8,
    cards_in_reserve_pile: u16,
    pile_to_cards: HashMap<Pile, Vec<Card>>,
    current_players: u8,

    players_ready: Vec<bool>,
    deal_index: u8,
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
    pub fn build_message_for_player(&self, player: &Player) -> crate::message::Response {
        let position = self.get_player_position(player) as u8;
        let card_counts = self
            .pile_to_cards
            .iter()
            .map(|(k, v)| (*k, v.len() as u16))
            .collect();
        let piles_cards = self
            .pile_to_cards
            .iter()
            .map(|(k, v)| {
                if k.visible_to_player(position) || player.id == "changgeng" {
                    (*k, v.clone())
                } else {
                    (*k, vec![])
                }
            })
            .collect();
        FullGame {
            game: crate::message::Game {
                id: self.id,
                players: self
                    .players
                    .iter()
                    .map(|p| p.as_ref().map(|x| x.id.clone()))
                    .collect(),
            },
            piles_cards,
            card_counts,
        }
    }
    pub fn deal(&mut self) -> bool {
        let card = {
            let draw_pile = self.pile_to_cards.get_mut(&Pile::DrawPile).unwrap();
            draw_pile.pop()
        };
        match card {
            Some(card) => {
                self.pile_to_cards
                    .get_mut(&Pile::Hand(self.deal_index))
                    .unwrap()
                    .push(card);

                let move_card_message = MoveCard {
                    position: self.deal_index,
                    source: Pile::DrawPile,
                    destination: Pile::Hand(self.deal_index),
                    cards: vec![card],
                };
                let hidden_move_card_message = HiddenMoveCard {
                    position: self.deal_index,
                    source: Pile::DrawPile,
                    destination: Pile::Hand(self.deal_index),
                    total_cards: 1,
                };

                self.players
                    .iter()
                    .enumerate()
                    .for_each(|(i, p)| match p.as_ref() {
                        Some(p) => p.send_message(if i as u8 == self.deal_index {
                            &move_card_message
                        } else {
                            &hidden_move_card_message
                        }),
                        _ => (),
                    });
            }

            None => (),
        }

        self.deal_index += 1;
        if self.deal_index == self.total_players {
            self.deal_index = 0;
        }

        !self
            .pile_to_cards
            .get_mut(&Pile::DrawPile)
            .unwrap()
            .is_empty()
    }
    pub fn player_start_game(&mut self, player: &Player) -> u8 {
        if !self
            .pile_to_cards
            .get(&Pile::DrawPile)
            .unwrap_or(&vec![])
            .is_empty()
        {
            player.send_message(&BadMessage {
                message: "Game is still in progress, cannot do this now".to_owned(),
            });
            return self.total_players;
        }

        let postion = self.get_player_position(player);
        *self.players_ready.get_mut(postion).unwrap() = true;
        let total_ready = self.players_ready.iter().filter(|&&x| x).count() as u8;

        if total_ready == self.total_players {
            // game start
            self.players_ready = vec![false; self.total_players as usize];
            // deal
            self.shuffle();
            self.players.iter().for_each(|p| match p {
                Some(a) => {
                    a.send_message(&GameStart);
                    ()
                }
                None => (),
            });
            return 0;
        }
        self.total_players - total_ready
    }

    pub fn get_list_of_players_id(&self) -> Vec<Option<String>> {
        self.players
            .iter()
            .map(|p| p.as_ref().map(|pp| pp.id.clone()))
            .collect()
    }
    pub fn get_game_id(&self) -> u32 {
        self.id
    }
    pub fn get_current_players(&self) -> u8 {
        self.current_players
    }
    pub fn shuffle(&mut self) {
        let mut all_cards: Vec<Card> = (0..4).flat_map(|_x| Card::generate_deck(true)).collect();
        shuffle(&mut all_cards);

        let mut piles_to_cards: HashMap<Pile, Vec<Card>> = HashMap::new();
        {
            let mut draw_cards: Vec<Card> = Vec::new();
            (0..self.total_decks as u16 * 54 - self.cards_in_reserve_pile).for_each(|_x| {
                draw_cards.push(all_cards.pop().unwrap());
            });
            piles_to_cards.insert(Pile::DrawPile, draw_cards);
            piles_to_cards.insert(Pile::ReservedPile, all_cards);
            piles_to_cards.insert(Pile::VisibleBuryPile, Vec::new());
            piles_to_cards.insert(Pile::SharedScorePile, Vec::new());
        }
        (0..self.total_players).for_each(|player| {
            piles_to_cards.insert(Pile::Hand(player), Vec::new());
            piles_to_cards.insert(Pile::DiscardPile(player), Vec::new());
            piles_to_cards.insert(Pile::ClaimPile(player), Vec::new());
            piles_to_cards.insert(Pile::ScorePile(player), Vec::new());
            piles_to_cards.insert(Pile::HiddenBuryPile(player), Vec::new());
        });
        self.pile_to_cards = piles_to_cards;
        self.deal_index = 0;
    }
    pub fn new(total_players: u8, total_decks: u8, cards_in_reserve_pile: u16) -> Game {
        Game {
            id: gen_game_id(),
            players: (0..total_players).map(|_x| Option::None).collect(),
            total_decks: total_decks,
            total_players: total_players,
            cards_in_reserve_pile: cards_in_reserve_pile,
            pile_to_cards: HashMap::new(),
            current_players: 0,
            players_ready: vec![false; usize::from(total_players)],
            deal_index: 0,
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

    pub fn player_join(&mut self, player: Arc<Player>, position: u8) -> error::Result<()> {
        if let Some(existing_player) = self.players.get(usize::from(position)) {
            if existing_player.is_some() {
                return Result::Err(error::GameError::PositionOccupied(position));
            }
            self.players[usize::from(position)] = Some(player);

            self.current_players += 1;
            return Result::Ok(());
        }

        Result::Err(error::GameError::InvalidPosition(position))
    }

    /*
    cards can duplicate
    */
    fn pile_contains_cards(&self, pile: Pile, cards: &Vec<Card>) -> error::Result<()> {
        if !self.pile_to_cards.contains_key(&pile) {
            return Result::Err(error::GameError::InvalidPile(pile));
        }

        let mut counts = cards.iter().fold(HashMap::new(), |mut m, c| {
            if m.contains_key(c) {
                *m.get_mut(c).unwrap() += 1;
                m
            } else {
                m.insert(c, 1);
                m
            }
        });

        self.pile_to_cards.get(&pile).unwrap().iter().for_each(|c| {
            if counts.contains_key(c) {
                *counts.get_mut(c).unwrap() -= 1;
            }
        });

        return match counts.iter().find(|(_card, count)| **count > 0) {
            Some((&&card, _)) => Result::Err(error::GameError::InvalidCard(card)),
            None => Result::Ok(()),
        };
    }
    pub fn player_move_all_cards(&mut self, player: &Player, from: Pile, to: Pile) -> error::Result<()> {
        let cards = {

         self.pile_to_cards.get(&from).map(|k| k.clone())
        };
         match cards {
            Some(cards) => self.player_move_cards(player, from, to, cards),
            None =>  Result::Err(error::GameError::InvalidPile(from))
        }
    }
    pub fn player_move_cards(
        &mut self,
        player: &Player,
        from: Pile,
        to: Pile,
        cards: Vec<Card>,
    ) -> error::Result<()> {
        let position = self.get_player_position(&player) as u8;
        if !from.allow_player_move_from(position) || !to.allow_player_move_to(position) {
            return Result::Err(error::GameError::NotAllowed);
        }
        if let e @ Result::Err(_) = self.pile_contains_cards(from, &cards) {
            return e;
        }
        // not very optimized but ok for now
        let total_cards = cards.len() as u16;
        cards
            .iter()
            .for_each(|card| self.move_card(from, to, card.clone()).unwrap());

        let mut move_card_message = MoveCard {
            position,
            source: from,
            destination: to,
            cards,
        };
        player.send_message(&move_card_message);

        if to.is_hidden() && from.is_hidden() {
            move_card_message = HiddenMoveCard {
                position,
                source: from,
                destination: to,
                total_cards,
            };
        }

        self.players.iter().for_each(|p| match p.as_ref() {
            Some(other) if other.id != player.id => other.send_message(&move_card_message),
            _ => (),
        });
        Result::Ok(())
    }

    fn get_player_position(&self, player: &Player) -> usize {
        self.players
            .iter()
            .position(|e| match e {
                Some(p) => p.id == player.id,
                None => false,
            })
            .unwrap()
    }

    pub fn remove_player(&mut self, player: &Player) {
        let position = self.get_player_position(player);
        self.players.get_mut(position).unwrap().take();
        self.current_players -= 1;
        *self.players_ready.get_mut(position).unwrap() = false;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::sync::mpsc;

    #[test]
    fn test_pile() {
        assert!(!Pile::DrawPile.allow_player_move_from(0));
        assert!(Pile::ClaimPile(0).allow_player_move_from(0));
        assert!(!Pile::ClaimPile(0).allow_player_move_from(1));
        assert!(Pile::SharedScorePile.allow_player_move_from(0));
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

    #[test]

    fn test_remove_player_from_game() {
        let mut game = Game::new(2, 1, 0);
        let (tx, _rx) = mpsc::unbounded_channel();

        let player = Arc::new(Player {
            id: "aaa".to_owned(),
            password: "bbb".to_owned(),
            tx,
        });

        game.player_join(player.clone(), 0).unwrap();

        println!("{:?}", game);
        game.remove_player(&player);
        println!("{:?}", game);
        assert!(game.players.get(0).unwrap().is_none());
        assert!(game.current_players == 0);
    }
}
