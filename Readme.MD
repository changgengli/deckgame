

* Run `cargo run` to start the server
* for web client, `cd webgame; npm start`


To test, use a websocket client connect to ws://localhost:3030/websocket
send message
 

 ```
 {"type": "StartGame",
"total_players": 4,
"total_decks": 3,
"cards_to_reserve": 6 
}

```

the first message need to be login