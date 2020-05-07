pub struct Game {
    users: Vec<Option<Player>>,

    total_player: u8,
    total_deck: u8,
    state: GameState,
    dealing_interval: u32,

}

pub enum GameState {

    WaitingForPlayer,
    ReadyToStart,
    Dealing,
    DealingEnd,
    Playing,
    PlayingEnd,
}

pub struct Player {
    id: String,
    password: String,
    state: PlayerState,
}


pub enum PlayerState {
    Offline,
    Normal,
    Disconnected,
}


pub enum CardDestination {
    Hand(Player),
    DrawPile,
    HiddenDiscardPile(Player),
    PublicDiscardPile(Player),
    ScorePile(Player),
    SharedScorePile,
}

public enum PlayerAction {
    Draw(Player, CardDestination), // Destination to Hand
    Call(Player, Card), // Hand to Public Discard Pile
    Score, //public discard to score
    MergeScore(Player), // Score to share score
    UndoScore, // score or share score to public discard pile
    TakeBack, // Discard pile to Hand
    


}