use std::fmt;
mod card;
mod game;
mod server;
mod error;

#[tokio::main]

async fn main() {
    println!("Hello, world!");

    let game = game::Game::new( 7,  3,  6);

    println!("{:?}", &game);
    server::start_server().await;

}
