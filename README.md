# Logseq AJAX Button Plugin

This plugin adds a custom macro that renders a button. When clicked, the button sends a POST request to a server. The message and server URL are configured directly in your Markdown using the macro arguments.

## Usage

Write a macro in any block:

```
{{renderer :ajax-button, url:"https://example.com/api", message:"Hello", label:"Send"}}
```

Arguments:

- `url` – Endpoint that receives the POST request.
- `message` – Message to send as JSON body `{ "message": "..." }`.
- `label` – Optional text shown on the button (defaults to "Send").

When clicked, the plugin sends a `POST` request with the JSON body including your message.

## Development

There is no build step. The plugin entry point is `index.js`. Run `npm test` to verify basic setup (no tests are defined).
