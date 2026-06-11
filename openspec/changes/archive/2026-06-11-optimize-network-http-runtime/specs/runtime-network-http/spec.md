## ADDED Requirements

### Requirement: HTTP facade preserves existing callback API
The Tyou HTTP runtime MUST preserve the existing callback-style facade while improving runtime behavior internally.

#### Scenario: Business sends an existing GET request
- **WHEN** business code calls `tyou.http.get(name, complete, error)` or `tyou.http.getWithParams(name, params, complete, error)`
- **THEN** the HTTP runtime keeps the existing method available
- **AND** successful compatible responses still invoke the complete callback

#### Scenario: Business sends an existing POST request
- **WHEN** business code calls `tyou.http.post(name, params, complete, error)`
- **THEN** the HTTP runtime keeps the existing method available
- **AND** POST data is sent as JSON body unless a future explicit API changes that contract

### Requirement: HTTP runtime supports mini-game request environments
The Tyou HTTP runtime MUST use available mini-game request APIs when present and MUST fall back to XMLHttpRequest when no supported platform request API exists.

#### Scenario: Mini-game request API exists
- **WHEN** a supported global platform object exposes `request`
- **THEN** HTTP requests are sent through that platform request API
- **AND** the runtime does not require browser-only `XMLHttpRequest`

#### Scenario: Browser request fallback is needed
- **WHEN** no supported mini-game request API exists and `XMLHttpRequest` is available
- **THEN** HTTP requests are sent through `XMLHttpRequest`

### Requirement: HTTP requests settle cache on every terminal path
The Tyou HTTP runtime MUST remove in-flight request records on success, HTTP failure, timeout, abort, platform fail, and parse errors.

#### Scenario: Request succeeds
- **WHEN** an HTTP request completes successfully
- **THEN** the in-flight record for that request is removed

#### Scenario: Request fails or times out
- **WHEN** an HTTP request fails, times out, is aborted, or cannot parse a JSON response
- **THEN** the in-flight record for that request is removed
- **AND** the error callback receives an event describing the failure class

#### Scenario: Duplicate request is already in flight
- **WHEN** the same method, final URL, request body, and response type are already in flight
- **THEN** the runtime does not send a second duplicate request
- **AND** it leaves the original request record active until that request settles

### Requirement: HTTP abort works across adapters
The Tyou HTTP runtime MUST abort matching in-flight HTTP requests when `abort(name)` is called.

#### Scenario: Browser request is aborted
- **WHEN** `abort(name)` matches an XMLHttpRequest-backed request
- **THEN** the runtime calls the request abort function if available
- **AND** removes the request record

#### Scenario: Mini-game request is aborted
- **WHEN** `abort(name)` matches a platform request task
- **THEN** the runtime calls the task abort function if available
- **AND** removes the request record

### Requirement: WebSocket runtime supports browser and mini-game sockets
The Tyou WebSocket runtime MUST support both browser `WebSocket` and mini-game `connectSocket` socket tasks behind the existing `ISocket` interface.

#### Scenario: Mini-game connectSocket exists
- **WHEN** a supported global platform object exposes `connectSocket`
- **THEN** `WebSock.connect(options)` uses the platform socket task
- **AND** socket task open, message, error, and close events are forwarded to the existing callbacks

#### Scenario: Browser WebSocket fallback is needed
- **WHEN** no supported mini-game socket API exists and `WebSocket` is available
- **THEN** `WebSock.connect(options)` uses browser `WebSocket`

#### Scenario: Socket is closed
- **WHEN** `WebSock.close(code, reason)` is called
- **THEN** the underlying socket is closed if it exists
- **AND** socket callbacks are cleared so closed sockets do not retain framework callbacks

### Requirement: NetNode lifecycle clears timers and pending state
The Tyou network node runtime MUST clear network-owned timers, pending requests, listeners, tips, and socket state when the node is closed.

#### Scenario: NetNode is closed by business
- **WHEN** business code closes a `NetNode`
- **THEN** heartbeat, receive-timeout, and reconnect timers are cleared
- **AND** pending requests and listeners are removed
- **AND** connection, reconnection, and request tips are hidden

#### Scenario: Closed NetNode receives stale socket events
- **WHEN** an old socket event arrives after `NetNode.close()`
- **THEN** the stale event does not reconnect or resend old requests through a closed node
