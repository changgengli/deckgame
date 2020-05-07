
use std::fmt;


fn main() {
    println!("Hello, world!");
}

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
impl Color{
    fn short_string(&self) -> &'static str {
        match *self {
            Color::Black => "b",
            Color::Red => "r",
        }
    }
}
pub trait Card:fmt::Display {
    fn name(&self) ->&'static str;
    fn annotation(&self) -> &'static str;

}
//TODO: debug still relevant? It was used to print a vec of cards.
/// An unnamed tuple with Value and Suit.
#[derive(Debug, Eq, PartialEq, Copy, Clone, Ord, PartialOrd, Hash)]
pub struct NormalCard {
    pub value: Value,
    pub suit: Suit
}

#[derive(Debug, Eq, PartialEq, Copy, Clone, Ord, PartialOrd, Hash)]
pub struct JokerCard {
    pub color: Color,
}

impl JokerCard {
    pub fn new (color: Color) -> JokerCard {
        JokerCard{color: color}
    }
}

// so cards can be printed using fmt method
impl fmt::Display for JokerCard {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}{}", self.color.short_string(), 0)
    }
}

impl NormalCard {
    pub fn new(value: Value, suit: Suit) -> NormalCard {
        NormalCard{ value: value, suit: suit }
    }
}


// so cards can be printed using fmt method
impl fmt::Display for NormalCard {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}{}", self.value.short_string(), self.suit.short_string())
    }
}

impl Card for NormalCard {
     fn name(&self) -> &'static str{
        self.value.short_string()
    }

    fn annotation(&self) ->&'static str {
        self.suit.short_string()
    }

}

impl Card for JokerCard {
    fn name(&self) -> &'static str{
        "0"
    }

    fn annotation(&self) ->&'static str {
        self.color.short_string()
    }

}