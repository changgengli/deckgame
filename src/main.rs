use std::fmt;
mod card;
mod game;

fn main() {
    println!("Hello, world!");

    let game = game::Game::new( 7,  3,  6);

    println!("{:?}", &game);
}
