use crate::message::Response;
use tokio::sync::mpsc;
use warp::ws::Message;

type TX = mpsc::UnboundedSender<Result<Message, warp::Error>>;

#[derive(Debug)]
pub struct Player {
    pub id: String,
    pub password: String,
    pub tx: TX,
}
impl Player {
    pub fn send_message(&self, message: &Response) -> bool {
        match self
            .tx
            .send(Ok(Message::text(serde_json::to_string(&message).unwrap())))
        {
            Result::Err(e) => {
                print!("{:?} ", e);
                false
            }
            _ => true,
        }
    }
}
