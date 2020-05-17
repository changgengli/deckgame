use serde::{Deserialize, Serialize};




#[derive(Debug, Eq, PartialEq, Copy, Clone, Ord, PartialOrd, Hash)]
#[derive(Serialize, Deserialize)]
pub struct Card {
    value: u8,
}
impl Card {
    pub fn generate_deck(with_joker: bool) -> Vec<Card> {
        let cards = match with_joker {
            true => 53,
            false => 51,
        };
        (0..cards)
            .map(|y: u8| Card{value:y})
            .collect()
    }
}
