mod card;
mod game;
mod server;
mod error;
mod message;

#[tokio::main]

async fn main() {
    println!("Hello, world!");

    server::start_server().await;

}
