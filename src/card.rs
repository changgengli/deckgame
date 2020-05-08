#[derive(Debug, Eq, PartialEq, Copy, Clone, Ord, PartialOrd, Hash)]
pub enum Suit {
    Spades,
    Hearts,
    Diamonds,
    Clubs,
}

impl Suit {
    fn short_string(&self) -> &'static str {
        match *self {
            Suit::Spades => "s",
            Suit::Hearts => "h",
            Suit::Diamonds => "d",
            Suit::Clubs => "c",
        }
    }
}

#[derive(Debug, Eq, PartialEq, Copy, Clone, Ord, PartialOrd, Hash)]
pub enum Value {
    Two,
    Three,
    Four,
    Five,
    Six,
    Seven,
    Eight,
    Nine,
    Ten,
    Jack,
    Queen,
    King,
    Ace,
}

impl Value {
    fn short_string(&self) -> &'static str {
        match *self {
            Value::Two => "2",
            Value::Three => "3",
            Value::Four => "4",
            Value::Five => "5",
            Value::Six => "6",
            Value::Seven => "7",
            Value::Eight => "8",
            Value::Nine => "9",
            Value::Ten => "T",
            Value::Jack => "J",
            Value::Queen => "Q",
            Value::King => "K",
            Value::Ace => "A",
        }
    }
}

#[derive(Debug, Eq, PartialEq, Copy, Clone, Ord, PartialOrd, Hash)]
pub enum Color {
    Black,
    Red,
}

impl Color {
    fn short_string(&self) -> &'static str {
        match *self {
            Color::Black => "b",
            Color::Red => "r",
        }
    }
}

#[derive(Debug, Eq, PartialEq, Copy, Clone, Ord, PartialOrd, Hash)]
pub enum Card {
    Normal { value: Value, suit: Suit },
    Joker { color: Color },
}

impl Card {
    fn create_card_for_value(value: u8) -> Card {
        match value {
            52 => Card::Joker {
                color: Color::Black,
            },
            53 => Card::Joker { color: Color::Red },
            _ => {
                let suit = match value / 13 {
                    0 => Suit::Spades,
                    1 => Suit::Hearts,
                    2 => Suit::Diamonds,
                    3 => Suit::Clubs,
                    _ => panic!("Unexpected suit conversion number"),
                };

                let value = match value % 13 {
                    0 => Value::Two,
                    1 => Value::Three,
                    2 => Value::Four,
                    3 => Value::Five,
                    4 => Value::Six,
                    5 => Value::Seven,
                    6 => Value::Eight,
                    7 => Value::Nine,
                    8 => Value::Ten,
                    9 => Value::Jack,
                    10 => Value::Queen,
                    11 => Value::King,
                    12 => Value::Ace,
                    _ => panic!("Unexpected value conversion number"),
                };
                Card::Normal {
                    value: value,
                    suit: suit,
                }
            }
        }
    }
    pub fn generate_deck(with_joker: bool) -> Vec<Card> {
        let cards = match with_joker {
            true => 53,
            false => 51,
        };
        (0..cards)
            .map(|y: u8| Card::create_card_for_value(y))
            .collect()
    }
}
