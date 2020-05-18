use crate::card::Card;
use crate::error;
use crate::game;
use crate::hall;
use crate::message;
use crate::player;
use futures_util::future::*;
use std::sync::{Arc, Weak};
use tokio::sync::{mpsc, RwLock};
use warp::ws::Message;
type Hall = Arc<RwLock<hall::Hall>>;
type Game = Arc<RwLock<game::Game>>;
type Player = Arc<player::Player>;
type TX = mpsc::UnboundedSender<Result<Message, warp::Error>>;
use tokio::time::{self, Duration};

#[derive(Clone, Debug)]
pub struct Session {
    hall: Hall,
    player: Option<Player>,
    game: Option<Game>,
}

pub fn send_bad_message(tx: &TX, message: String) -> bool {
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

pub fn send_message(tx: &TX, message: &message::Response) -> bool {
    match tx.send(Ok(Message::text(serde_json::to_string(&message).unwrap()))) {
        Result::Err(e) => {
            print!("{:?} ", e);
            false
        }
        _ => true,
    }
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
        {
            let game = self.game.as_ref().unwrap();
            let mut game = game.write().await;
            game.remove_player(&self.player.as_ref().unwrap());
            if game.get_current_players() == 0 {
                self.hall.write().await.remove_game(game.get_game_id());
            }
        }
        self.game.take();
    }

    pub async fn create_game(&mut self, mut game: game::Game) {
        game.player_join(self.player.as_ref().unwrap().clone(), 0)
            .unwrap();
        let game_id = game.get_game_id();
        let game = Arc::new(RwLock::new(game));
        self.game.replace(game.clone());
        self.hall.write().await.add_game(game_id, game);
    }

    pub async fn login(&mut self, player: player::Player) {
        let hall = self.hall.write().await;
        if hall.has_player(&player.id) {
            self.player
                .as_ref()
                .unwrap()
                .send_message(&message::Response::BadMessage {
                    message: "There is already a user in the game with this id".to_owned(),
                });
            return;
        }
        let player = Arc::new(player);
        self.player.replace(player.clone());
        self.hall.write().await.add_player(player);
    }

    pub async fn player_join_game(&mut self, game_id: u32, position: u8) -> bool {
        let tx = &self.player.as_ref().unwrap().tx;
        match self.hall.read().await.get_game(game_id) {
            Some(game) => {
                let player = self.player.as_ref().unwrap().clone();
                match game.write().await.player_join(player, position) {
                    Result::Ok(_) => {
                        self.game.replace(game.clone());
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
    pub async fn build_game_message(&self) -> message::Response {
        self.game
            .as_ref()
            .unwrap()
            .read()
            .await
            .build_message_for_player(&self.player.as_ref().unwrap())
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
    // called when use disconnect
    pub async fn destroy(&mut self) {
        if self.player.is_some() {
            if self.game.is_some() {
                self.leave_game().await;
            }

            self.hall
                .write()
                .await
                .remove_player(&self.player.take().unwrap().id);
        }
        drop(self);
    }

    pub async fn player_start_game(&mut self) {
        let waiting = self
            .game
            .as_ref()
            .unwrap()
            .write()
            .await
            .player_start_game(&self.player.as_ref().unwrap());

        if waiting == 0 {
            let game = self.game.as_ref().unwrap().clone();
            tokio::spawn(async move {
                let weak_game: Weak<RwLock<game::Game>> = Arc::downgrade(&game);
                drop(game);
                Session::deal_cards(weak_game).await;
            });
        }
    }

    async fn deal_cards(game: Weak<RwLock<game::Game>>) {
        let mut has_more = true;
        while has_more {
            has_more = match game.upgrade() {
                Some(g) => g.write().await.deal(),
                None => false,
            };

            if has_more {
                let mut interval = time::interval(Duration::from_millis(300));
                interval.tick().await;
            } else {
                print!("Game stopped or no more card to deal");
            }
        }
    }

    pub async fn chat(&self, message: String) {
        let message = message::Response::Chat {
            player_id: self.player.as_ref().unwrap().id.clone(),
            message,
        };
        self.hall.read().await.iter_players().for_each(|(_id, p)| {
            send_message(&p.tx, &message);
        })
    }

    pub async fn player_move_cards(
        &mut self,
        source: game::Pile,
        destination: game::Pile,
        cards: Vec<Card>,
    ) -> error::Result<()> {
        self.game.as_ref().unwrap().write().await.player_move_cards(
            self.player.as_ref().unwrap(),
            source,
            destination,
            cards,
        )
        // Result::Ok(())
    }
    pub async fn

    player_move_all_cards (
        &mut self,
        source: game::Pile,
        destination: game::Pile,
    ) -> error::Result<()> {
        self.game.as_ref().unwrap().write().await.player_move_all_cards(
            self.player.as_ref().unwrap(),
            source,
            destination,
        )
        // Result::Ok(())
    }
}
