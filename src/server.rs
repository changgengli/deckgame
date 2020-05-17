use crate::game;
use crate::hall;
use crate::message;
use crate::player;
use crate::session::*;
use futures_util::future::FutureExt;
use futures_util::stream::StreamExt;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use warp::ws::{Message, WebSocket};
use warp::{http::Method, Filter};
type Hall = Arc<RwLock<hall::Hall>>;
type TX = mpsc::UnboundedSender<Result<Message, warp::Error>>;

async fn handle_message(msg: Message, session: &mut Session, tx: &TX) -> bool {
    // Skip any non-Text messages...
    let msg = if let Ok(s) = msg.to_str() {
        s
    } else {
        return send_bad_message(&tx, "Websocket: Only text message is supported".to_owned());
    };

    if msg.len() > 1000 {
        return send_bad_message(&tx, "message too long".to_owned());
    }

    let msg = serde_json::from_str::<message::Request>(&msg);
    match msg {
        Result::Ok(message::Request::Ping) => send_message(&tx, &message::Response::Pong),

        Result::Ok(message::Request::LeaveGame) => {
            if !session.is_in_game() {
                return send_bad_message(&tx, "Player not in a game".to_owned());
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
            let player = player::Player {
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

        Result::Ok(message::Request::StartGame) => {
            if !session.is_in_game() {
                return send_bad_message(&tx, "Player not in a game".to_owned());
            }
            session.player_start_game().await;
            true
        }

        Result::Ok(message::Request::Chat { message }) => {
            if !session.is_login() {
                return send_bad_message(&tx, "Not yet login".to_string());
            }
            session.chat(message).await;
            send_message(&tx, &message::Response::Pong)
        }

        Result::Ok(message::Request::MoveCard {
            source,
            destination,
            cards,
        }) => {
            if !session.is_in_game() {
                return send_bad_message(&tx, "Player not in a game".to_owned());
            }
            if let Result::Err(e) = session.player_move_cards(source, destination, cards).await {
                return send_bad_message(&tx, e.to_string());
            }
            send_message(&tx, &message::Response::Pong)
        }
        Result::Ok(message::Request::Game) => {
            if !session.is_in_game() {
                return send_bad_message(&tx, "Player not in a game".to_owned());
            }
            send_message(&tx, &session.build_game_message().await)
        }
        Result::Err(_e) => send_bad_message(&tx, "Cannot parse message".to_owned()),
    }
}

async fn on_disconnect(mut session: Session) {
    eprintln!("player disconnected {:?}", session);
    session.destroy().await;
}

pub async fn start_server() {
    pretty_env_logger::init();

    let hall = Arc::new(RwLock::new(hall::Hall::new()));
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

async fn on_connected(ws: WebSocket, hall: Hall) {
    let (user_ws_tx, mut user_ws_rx) = ws.split();
    let (tx, rx) = mpsc::unbounded_channel();
    tokio::task::spawn(rx.forward(user_ws_tx).map(|result| {
        if let Err(e) = result {
            eprintln!("websocket send error: {}", e);
        }
    }));

    let mut session = Session::new(hall);

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
