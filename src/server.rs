use crate::game;
use crate::message;
use futures_util::future::FutureExt;
use futures_util::future::*;
use futures_util::stream::StreamExt;
use std::fmt;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use warp::ws::{Message, WebSocket};
use warp::{http::Method, Filter};

type Hall = Arc<RwLock<game::Hall>>;
type Game = Arc<RwLock<game::Game>>;
type Player = Arc<game::Player>;
type TX = mpsc::UnboundedSender<Result<Message, warp::Error>>;

mod session {
    use super::*;
    #[derive(Clone, Debug)]
    pub struct Session {
        hall: Hall,
        player: Option<Player>,
        game: Option<Game>,
    }

    impl Session {
        pub fn new(hall: Hall) -> Session {
            Session {
                hall: hall,
                player: Option::None,
                game: Option::None,
            }
        }
        pub fn is_in_game(&self) -> bool {
            self.game.is_some()
        }

        pub fn is_login(&self) -> bool {
            self.player.is_some()
        }

        pub async fn leave_game(&mut self) {
            let game = self.game.as_ref().unwrap();
            let mut game = game.write().await;

            game.remove_player(&self.player.as_ref().unwrap());
            if game.get_current_players() == 0 {
                self.hall.write().await.remove_game(game.get_game_id());
            }
        }

        pub async fn create_game(&mut self, mut game: game::Game) {
            game.player_join(self.player.as_ref().unwrap().clone(), 0)
                .unwrap();
            let game_id = game.get_game_id();
            let game = Arc::new(RwLock::new(game));
            self.game.replace(game.clone());
            self.hall.write().await.add_game(game_id, game);
        }

        pub async fn login(&mut self, player: game::Player) {
            let player = Arc::new(player);
            self.player.replace(player.clone());
            self.hall.write().await.add_player(player);
        }

        pub async fn player_join_game(&mut self, game_id: u32, position: u8) -> bool {
            let tx = self.player.as_ref().unwrap().tx.clone();
            match self.hall.read().await.get_game(game_id) {
                Some(game) => {
                    let player = self.player.as_ref().unwrap().clone();
                    match game.write().await.player_join(player, position) {
                        Result::Ok(_) => {
                            return send_message(&tx, &message::Response::Pong);
                        }
                        Result::Err(_e) => {
                            return send_bad_message(&tx, "position occupied".to_string());
                        }
                    }
                }
                None => {
                    return send_bad_message(&tx, "bad game id".to_string());
                }
            }
        }

        pub async fn build_hall_message(&self) -> message::Response {
            let hall = self.hall.read().await;
            let games = hall
                .iter_games()
                .map(|(id, game)| async move {
                    message::Game {
                        id: *id,
                        players: game.read().await.get_list_of_players_id(),
                    }
                })
                .collect::<Vec<_>>();

            let games = join_all(games).await;

            let players = hall.iter_players().map(|(id, _p)| id.clone()).collect();

            message::Response::Hall { games, players }
        }
        // pub fn safe_modify_status<F>(&mut self, modify_game: F)
        // where
        //     F: FnOnce(Game, Player) -> (Game, Player),
        // {
        //     match mem::replace(&mut self.status, None) {
        //         Option::None => {
        //             panic!(
        //                 "this should never occur. so we panic to ensure if it does, we know right away"
        //             );
        //         }
        //         Option::Some(arg) => {
        //             mem::replace(&mut self.status, Some(modify_game(arg)));
        //         }
        //     };
        // }
    }
}
async fn on_connected(ws: WebSocket, hall: Hall) {
    // Split the socket into a sender and receive of messages.
    let (user_ws_tx, mut user_ws_rx) = ws.split();

    // Use an unbounded channel to handle buffering and flushing of messages
    // to the websocket...
    let (tx, rx) = mpsc::unbounded_channel();
    tokio::task::spawn(rx.forward(user_ws_tx).map(|result| {
        if let Err(e) = result {
            eprintln!("websocket send error: {}", e);
        }
    }));

    let mut session = session::Session::new(hall);

    while let Some(result) = user_ws_rx.next().await {
        let msg = match result {
            Ok(msg) => msg,
            Err(e) => {
                eprintln!("websocket error: {}", e);
                break;
            }
        };
        if !handle_message(msg, &mut session, &tx).await {
            break;
        }
    }
    on_disconnect(session).await;
}

async fn handle_message(msg: Message, session: &mut session::Session, tx: &TX) -> bool {
    // Skip any non-Text messages...
    let msg = if let Ok(s) = msg.to_str() {
        s
    } else {
        println!("Not textual message");
        return send_bad_message(&tx, "Websocket: Only text message is supported".to_owned());
    };


    let msg = serde_json::from_str::<message::Request>(&msg);
    match msg {
        Result::Ok(message::Request::Ping) => send_message(&tx, &message::Response::Pong),

        Result::Ok(message::Request::LeaveGame) => {
            if !session.is_in_game() {
                return send_bad_message(&tx, "Play not in a game".to_owned());
            }
            session.leave_game().await;
            send_message(&tx, &message::Response::Pong)
        }
        Result::Ok(message::Request::CreateGame {
            total_decks,
            total_players,
            cards_to_reserve,
        }) => {
            if !session.is_login() {
                return send_bad_message(&tx, "Not yet login".to_string());
            }
            let game = game::Game::new(total_players, total_decks, cards_to_reserve);
            session.create_game(game).await;
            send_message(&tx, &message::Response::Pong)
        }

        Result::Ok(message::Request::Login { id, password }) => {
            let player = game::Player {
                id,
                password,
                tx: tx.clone(),
            };
            session.login(player).await;
            send_message(&tx, &message::Response::Pong)
        }
        Result::Ok(message::Request::JoinGame { game_id, position }) => {
            if !session.is_login() {
                return send_bad_message(&tx, "Not yet login".to_string());
            }
            session.player_join_game(game_id, position).await
        }
        Result::Ok(message::Request::Hall) => {
            send_message(&tx, &session.build_hall_message().await)
        }

        Result::Err(_e) => send_bad_message(&tx, "Cannot parse message".to_owned()),
    }
    // New message from this user, send it to everyone else (except same uid)...
    //
    // We use `retain` instead of a for loop so that we can reap any user that
    // appears to have disconnected.
    // for (&uid, tx) in users.lock().await.iter_mut() {
    //     if my_id != uid {
    //         if let Err(_disconnected) = tx.send(Ok(Message::text(new_msg.clone()))) {
    //             // The tx is disconnected, our `on_disconnect` code
    //             // should be happening in another task, nothing more to
    //             // do here.
    //         }
    //     }
    // }
}

async fn on_disconnect(session: session::Session) {
    eprintln!("player disconnected {:?}", session);

    // Stream closed up, so remove from the user list
    // users.lock().await.remove(&my_id);
}

pub async fn start_server() {
    pretty_env_logger::init();

    // Keep track of all connected users, key is usize, value
    // is a websocket sender.
    let hall = Arc::new(RwLock::new(game::Hall::new()));
    // Turn our "state" into a new Filter...
    // let hall = Arc::new
    let hall = warp::any().map(move || hall.clone());
    let cors = warp::cors().allow_methods(&[Method::GET, Method::POST, Method::DELETE]);
    let cors = warp::any().map(warp::reply).with(cors);

    let websocket = warp::path("websocket")
        .and(warp::ws())
        .and(hall)
        .map(|ws: warp::ws::Ws, hall| ws.on_upgrade(move |socket| on_connected(socket, hall)));

    let hi = warp::path("hi").map(|| "Hello, World!");

    warp::serve(hi.or(websocket).or(cors))
        .run(([127, 0, 0, 1], 3030))
        .await;
}

fn send_bad_message(tx: &TX, message: String) -> bool {
    match tx.send(Ok(Message::text(
        serde_json::to_string(&message::Response::BadMessage { message: message }).unwrap(),
    ))) {
        Result::Err(e) => {
            print!("{:?} ", e);
            false
        }
        _ => true,
    }
}

fn send_message(tx: &TX, message: &message::Response) -> bool {
    match tx.send(Ok(Message::text(serde_json::to_string(&message).unwrap()))) {
        Result::Err(e) => {
            print!("{:?} ", e);
            false
        }
        _ => true,
    }
}
