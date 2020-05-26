use serde::{Deserialize, Deserializer, Serialize, Serializer};

#[derive(Debug, Eq, PartialEq, Copy, Clone, Ord, PartialOrd, Hash)]
pub struct Card {
    value: u8,
}
impl Card {
    pub fn generate_deck(with_joker: bool) -> Vec<Card> {
        let cards = match with_joker {
            true => 54,
            false => 52,
        };
        (0..cards).map(|y: u8| Card { value: y }).collect()
    }
}

impl Serialize for Card {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_u8(self.value)
    }
}
impl<'de> Deserialize<'de> for Card {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        deserializer.deserialize_u8(CardVisitor {})
    }
}

struct CardVisitor {}
use std::fmt;

use serde::de::Visitor;

impl<'de> Visitor<'de> for CardVisitor {
    type Value = Card;
    fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
        formatter.write_str("an integer between 1 to 2^8 ")
    }

    // fn visit_u8<E>(self, value: u8) -> Result<Self::Value, E>
    // where
    //     E: serde::de::Error,
    // {
    //     Ok(Card { value })
    // }

    fn visit_u64<E>(self, value: u64) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        if value >= u64::from(u8::MIN) && value <= u64::from(u8::MAX) {
            Ok(Card { value: value as u8 })
        } else {
            Err(E::custom(format!("u8 out of range: {}", value)))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn card_json() {
        let c = Card { value: 15 };

        let j = serde_json::to_string(&c).unwrap();

        assert!(j.eq("15"));

        let d: Card = serde_json::from_str("15").unwrap();
        assert!(d.value == 15)
    }
}
