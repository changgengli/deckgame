mod card;
mod error;
mod game;
mod hall;
mod message;
mod player;
mod server;
mod session;
#[tokio::main]

async fn main() {
    println!("Hello, world!");

    server::start_server().await;
}
