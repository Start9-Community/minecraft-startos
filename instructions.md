# Minecraft Server

This package runs a vanilla Minecraft Java Edition server alongside a built-in RCON Web Admin console. There is no default Web Admin password — the service will not start until you run the **Set Web Admin Password** action, which generates a random password and shows it to you once.

## Documentation

- [`itzg/docker-minecraft-server` documentation](https://docker-minecraft-server.readthedocs.io/) — the upstream image's reference for environment variables, world data layout, and operational behavior.

## What you get on StartOS

- A vanilla Minecraft Java Edition server reachable on TCP port **25565**, surfaced as the **Minecraft Server** interface.
- A web-based **RCON Web Admin** console for sending server commands and watching the live log, surfaced as the **Web Admin** interface.
- Package-managed `server.properties`: gameplay settings (game mode, difficulty, view/simulation distance, MOTD, max players, PvP, hardcore, flight, spawn protection, pause-when-empty, online mode) are written by the **Configure Server** action. Manual edits to keys the package doesn't model are preserved.
- A managed whitelist persisted in package state and synchronized to `whitelist.json` whenever the whitelist is enabled.
- Memory profiles (Starter / Standard / High, or a custom heap size) selected from the configuration form rather than tuned via JVM flags.
- World management — list, create, switch between, and delete saved worlds — without dropping into a shell.

## Getting set up

1. Open the service's **Tasks** panel and run the **critical** task **Set Web Admin Password**. This generates a random Web Admin password and shows it to you once — save it to your password manager before leaving the screen. The service cannot start until this is done. The username is `admin`.
2. Start the service from the **Dashboard** tab. First boot writes a fresh `server.properties` with sane defaults and generates the default world.
3. (Optional) Run **Configure Server** to adjust game mode, difficulty, memory profile, MOTD, max players, view/simulation distance, PvP, flight, hardcore, online mode, spawn protection, pause-when-empty, or to enable the whitelist. The service restarts automatically to apply the changes.
4. To let players reach the server from the public internet, forward TCP **25565** on your router to your StartOS host. LAN-only and Tor-only play work without any router changes. Pick the address you want each client to use from the **Minecraft Server** interface panel.
5. Open the **Web Admin** interface in your browser and log in with `admin` plus the password generated in step 1 to send server commands and watch the live log.

## Using Minecraft Server

### Minecraft Server interface

Use the address shown on the **Minecraft Server** interface as the server address in the Minecraft Java Edition client. The port is the standard `25565` — no port number is needed in the client.

### RCON Web Admin interface

The **Web Admin** interface is the RCON-backed server console. Once logged in, you can issue any Minecraft server command (`op <player>`, `say`, `weather`, `gamerule`, etc.) and tail the live log. RCON traffic stays inside the package — only the proxied web UI is exposed.

### Setup actions

- **Set Web Admin Password** — generate a fresh random Web Admin password and show it once. Re-run any time to rotate the password; the service restarts automatically to apply it.
- **Configure Server** — gameplay, world generation, performance, networking-related toggles (online mode, max players), and memory profile.
- **Get Server Info** — show the active server configuration (game mode, difficulty, memory, MOTD, max players, whitelist state, whitelisted players, Web Admin username).

### Worlds

- **List Worlds** — list every world save under the data volume with last-modified time, indicating which is the currently configured world.
- **Create World** — stage a new world by name with an optional seed; the next start will generate it.
- **Select World** — switch which existing saved world the server will boot into.
- **Delete World** — permanently remove a saved world. Available only when the service is stopped, since the active world is locked while the server is running.

### Whitelist

- **Add to Whitelist** — add a Minecraft username (UUID optional) to the whitelist. Enabling the whitelist via **Configure Server** restricts logins to whitelisted players; the package writes `whitelist.json` for the server to read.
- **Remove from Whitelist** — remove a player. If the list becomes empty, the whitelist is automatically disabled.

### Live stats

- **Get Live Server Stats** — query the running server over RCON for connected players, in-game time of day and Minecraft clock, world day, and moon phase.

## Limitations

- This package targets vanilla Java Edition. Mod loaders, proxy stacks, and other non-vanilla modes that `itzg/minecraft-server` can run via environment variables are not surfaced as StartOS actions.
- The image's environment-variable-driven configuration is bypassed (the package writes `server.properties` directly), so settings normally exposed through upstream env vars must be set through **Configure Server** or by hand-editing the file.
