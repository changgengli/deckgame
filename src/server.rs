use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::message;
use futures_util::future::FutureExt;
use futures_util::stream::StreamExt;
use std::rc::Rc;
use std::sync::{

    atomic::{AtomicUsize, Ordering, AtomicU8},
    Arc,
};
use tokio::sync::{mpsc, Mutex, RwLock};

use warp::ws::{Message, WebSocket};
use warp::{http::Method, Filter};

use crate::game;

/// Our global unique user id counter.
// static NEXT_USER_ID: AtomicUsize = AtomicUsize::new(1);

/// Our state of currently connected users.
///
/// - Key is their id
/// - Value is a sender of `warp::ws::Message`
// type Users = Arc<RwLock<HashMap<usize, mpsc::UnboundedSender<Result<Message, warp::Error>>>>>;

type Hall = Arc<RwLock<game::Hall>>;

type Game = Arc<RwLock<game::Game>>;
type Player = game::Player;
type TX = mpsc::UnboundedSender<Result<Message, warp::Error>>;

#[derive( Clone)]
struct Session {
    hall: Hall,
    player: Option<Arc<Player>>,
    game: Option<Game>,
    position: Arc<u8>,
}

async fn user_connected(ws: WebSocket, hall: Hall) {
    // Use a counter to assign a new unique ID for this user.
    // let my_id = NEXT_USER_ID.fetch_add(1, Ordering::Relaxed);

    // eprintln!("new game user: {}", my_id);

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

    // Save the sender in our list of connected users.
    // users.lock().await.insert(my_id, tx);

    // Return a `Future` that is basically a state machine managing
    // this specific user's connection.

    // Make an extra clone to give to our disconnection handler...

    // Every
    //  time the user sends a message, broadcast it to
    // all other users...

    let session = Session{
        hall: hall,
        player: Option::None,
        game: Option::None,
        position:Arc::new(0),
    };

    while let Some(result) = user_ws_rx.next().await {
        let msg = match result {
            Ok(msg) => msg,
            Err(e) => {
                eprintln!("websocket error(uid={:?}): {}", session.player, e);
                break;
            }
        };
       if !user_message(msg, session.clone(), &tx).await {
           break;
       }
    }
    // user_ws_rx stream will keep processing as long as the user stays
    // connected. Once they disconnect, then...
    user_disconnected(session).await;
}

async fn user_message(
    msg: Message,
    session: Session,
    tx: &TX,
) -> bool {
    // Skip any non-Text messages...
    let msg = if let Ok(s) = msg.to_str() {
        s
    } else {
        println!("Not textual message");        
       return  send_bad_message(&tx, "Websocket: Only text message is supported".to_owned());
    };

    let msg = serde_json::from_str::<message::Request>(&msg);
    match msg {
        Result::Ok(message::Request::Ping) => {
            return send_message(&tx, &message::Response::Pong);
        },

        Result::Ok(message::Request::LeaveGame) => {
            if session.game.is_none() {
                return send_bad_message( &tx, "Play not in a game".to_owned());
            }

            let game = session.game.as_ref().unwrap();
    
            game.write().await.remove_player(session.player.unwrap());
         },
         Result::Ok(message::Request::CreateGame{total_decks:total_decks, total_players:total_players, cards_to_reserve: cards_to_reserve  }) => {
            if session.player.is_none() {
                return send_bad_message(&tx, "Not yet login".to_string());
            }

            let mut game = game::Game::new(total_players, total_decks, cards_to_reserve);
            game.player_join(session.player.unwrap().clone(), 0);
            let game_id = game.get_game_id();
            session.game=Option::Some(Arc::new(RwLock::new( game)));

            session.hall.write().await.add_game(game_id, session.game.as_ref().unwrap().clone());
            return send_message(&tx, &message::Response::Pong);
         },

         Result::Ok(message::Request::Login{id: id, password: password}) => {
            let player = Arc::new(game::Player{
                id: id,
                password: password,
                tx: tx.clone(),
            }); 
            session.player = Some(player.clone());
            let h= session.hall.write().await.add_player(player);
            
            tx.send(Ok(Message::text(
                serde_json::to_string(&message::Response::Pong).unwrap(),
            ))).unwrap();
         },

         Result::Ok(message::Request::JoinGame{game_id: game_id, position: position}) => {
            if session.player.is_none() {
                return send_bad_message(&tx, "Not yet login".to_string());
            }

            
            session.position = Arc::new(position);

            match session.hall.read().await.get_game(game_id) {
                Some(game) => {
                    
                    let player = session.player.unwrap().clone();

                    let g = game;
// session.game = Option::Some(game);

                    //game.write().await.player_join(player, position);

                    tx.send(Ok(Message::text(
                        serde_json::to_string(&message::Response::Pong).unwrap(),
                    ))).unwrap();

                    },
                None => {
                    return send_bad_message(&tx, "bad game id".to_string());
                }
            }

         },


         Result::Err(_e) => {
            tx.send(Ok(Message::text(
                serde_json::to_string(&message::Response::BadMessage{message: "Cannot parse message".to_owned()}).unwrap(),
            ))).unwrap();
        }
    };

    true
    // New message from this user, send it to everyone else (except same uid)...
    //
    // We use `retain` instead of a for loop so that we can reap any user that
    // appears to have disconnected.
    // for (&uid, tx) in users.lock().await.iter_mut() {
    //     if my_id != uid {
    //         if let Err(_disconnected) = tx.send(Ok(Message::text(new_msg.clone()))) {
    //             // The tx is disconnected, our `user_disconnected` code
    //             // should be happening in another task, nothing more to
    //             // do here.
    //         }
    //     }
    // }
}

async fn user_disconnected(session: Session) {
    eprintln!("player disconnected {:?}, {:?}",  session.game, session.player);

    
    
    
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
        .map(|ws: warp::ws::Ws, hall| ws.on_upgrade(move |socket| user_connected(socket, hall)));

    let hi = warp::path("hi").map(|| "Hello, World!");

    warp::serve(hi.or(websocket).or(cors))
        .run(([127, 0, 0, 1], 3030))
        .await;
}



fn send_bad_message ( tx: &TX, message: String )-> bool{
    match 
    tx.send(Ok(Message::text(
        serde_json::to_string(&message::Response::BadMessage{message: message}).unwrap(),
    ))) {
        Result::Err(e) => {
            print!("{:?} ", e);
            false 
        },
        _ => true,
    }
}

fn send_message (tx: &TX, message: &message::Response) -> bool {
    match 
    tx.send(Ok(Message::text(
        serde_json::to_string(&message).unwrap(),
    ))) {
        Result::Err(e) => {
            print!("{:?} ", e);
            false 
        },
        _ => true,
    }
}
