use std::error;
use std::fmt;
use crate::game::{Pile, PlayerAction};
use crate::card::Card;

pub type Result<T> = std::result::Result<T, GameError>;

#[derive(Debug, Clone, Eq, PartialEq)]
pub enum  GameError {

    NotAllowed,
    InvalidPile(Pile),
    InvalidCard(Card),
    InvalidPosition(u8),
    PositionOccupied(u8),
    InvalidPlayerCommand(PlayerAction),
}


impl fmt::Display for GameError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{:?}", &self)
    }
}

impl error::Error for GameError {
    fn source(&self) -> Option<&(dyn error::Error + 'static)> {
        None
    }
}
