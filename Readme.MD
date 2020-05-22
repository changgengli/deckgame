- Run `cargo run` to start the server
- for web client, `cd webgame; npm start`

To test, use a websocket client connect to ws://localhost:3030/websocket

The first message need to be login, for instance:

```json
{
  "type": "Login",
  "id": "test_user",
  "password": "test_user_pass"
}
```

Then send message:

```json
{
  "type": "StartGame",
  "total_players": 4,
  "total_decks": 3,
  "cards_to_reserve": 6
}
```

VSCode settings.json

```
 "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[rust]": {
    "editor.defaultFormatter": "matklad.rust-analyzer"
  }
```
