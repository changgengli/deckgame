mod card;
mod game;
mod server;
mod error;
mod message;
mod player;
mod hall;
mod session;
#[tokio::main]

async fn main() {
    println!("Hello, world!");

    server::start_server().await;

}
