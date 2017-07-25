<p align="center">
    <a href="https://eryn.io/RoVer/"><img src="http://i.imgur.com/j1jxb5F.png" alt="RoVer" /></a>
</p>

<p align="center">
    <a href="https://discordapp.com/oauth2/authorize?client_id=298796807323123712&scope=bot&permissions=402656264"><img src="http://i.imgur.com/8UBldnL.png" alt="Add" /></a>
</p>

[![Patreon](http://i.imgur.com/dujYlAK.png)](https://www.patreon.com/erynlynn)

# What is it?

RoVer is an open source, drop-in verification bot that will allow your members to safely authenticate their Roblox account on your Discord server. This empowers your Roblox community with the following advantages:

- Speak with confidence, because everyone is who their name says they are.
- Adding an extra step between trolls & spammers and your server will reduce unwanted activity drastically.
- The verification database is already populated with thousands of Discord-Roblox account links, so it's possible users will already be verified when they join your server.
- The hosted version of RoVer does not have any API rate limiting and will automatically be able to update roles the second the user verifies. (If you host RoVer yourself, the user will have to run a command in order for the verification to take place.)

# How does it work?

RoVer uses the same verification system used by the [ROBLOX Discord](https://discord.gg/roblox) server, a web app that lives at [verify.eryn.io](https://verify.eryn.io). RoVer makes use of its [public API](https://verify.eryn.io/api).

## Step 1

The user signs in with their Discord account.

<p align="center">
    <img src="http://i.imgur.com/oojqyop.png" alt="Step 1" />
</p>

## Step 2

The user chooses how they want to verify: by joining a ROBLOX game, or by adding a code to their profile.

<p align="center">
    <img src="http://i.imgur.com/t2ZTWtm.png" alt="Step 1" />
</p>

## Step 3

The user is verified and can participate in your community.

<p align="center">
    <img src="http://i.imgur.com/D0gnqf1.png" alt="Step 1" />
</p>

# Getting Started with RoVer

The quickest and easiest way to use RoVer is to [add the hosted version](https://discordapp.com/oauth2/authorize?client_id=298796807323123712&scope=bot&permissions=402656264) to your server.

You can also clone this repository and host it yourself and make any modifications you wish. 

After you add the bot to your server, you can customize RoVer with the following commands. You must have the `Administrator` permission in the Discord server in order to use these commands.

- `!RoVer` - Displays a list of commands
- `!VerifiedRole <exact role name>` - Set the role that verified members will get. Default `null`.
- `!NotVerifiedRole <exact role name>` - Set the role that non-verified members will get. Default `null`.
- `!Nickname <true|false>` - Set whether or not new users will be nicknamed to their Roblox name. Default `true`.
- `!AnnounceChannel <exact channel name>` - Set a channel that the bot will post a message to every time someone verifies. Default `null`.
- `!NicknameFormat <format>` - Set the nickname format, so you could have the nickname include their roblox id or discord name, for example. Available replacements are Available replacements are `%USERNAME%`, `%USERID%`, `%DISCORDNAME%`, and `%DISCORDID%`. Example: `%USERNAME% - (%USERID%)`. Default `%USERNAME%`.
- `!WelcomeMessage <welcome message>` - Set the message the user gets when they verify. Will be sent in DMs unless they use `!verify` command. Available replacements are `%USERNAME%`, `%USERID%`, `%DISCORDNAME%`, and `%DISCORDID%`. Default: `Welcome to the server, %USERNAME%!`. 
- `!BindGroupRank <roblox group id> <Discord Role> <((>|<|)group rank|\"all\")>` - See section below.
- `!UnbindGroupRank <role name>` - See section below.
- `!UnbindAllGroupRanks` - See section below.
- `!Update <@user>` - Forcibly update verification status of a user, same as them running `!verify`. Make sure you @mention the user.
- `!Whois <@user>` - Get a link to a verified user's profile.

You can run these commands without arguments to set them back to their default state.

When a user joins your server, the bot will automatically check if they are already in our database, and if so, they will be verified immediately. If they are not already in the database, they will be instructed to go to the verification website to verify themselves. If you are using the hosted version of the bot, then the user will automatically be given the verified state after they verify on the website. **However**, if you are hosting the bot yourself, the user will have to run the `!verify` command in order for the bot to check if they are verified.

You should probably make a read-only channel in the server explaining these processes to your members. 

## Setting up roles for Roblox group members and group ranks

- Use the following command to set up giving a role to all members of a group:

  `!BindGroupRank 372 GroupMember` where `372` is your *group id* and `GroupMember` is the *Discord role name*

- Use the following command to set up giving a role to members of a certain rank in a group:

  `!BindGroupRank 372 GroupOwner 255` where `372` is your *group id*, `255` is the *group roleset rank* (the number on the configure page, not the role name) and `GroupOwner` is the *Discord role name*

- Use the following command to set up giving a role to members of a **rank or higher** in a group: (*Note! This uses a "greater than or equal to" comparison*)

  `!BindGroupRank 372 GroupAdmin >200` where `372` is your *group id*, `200` is the *group roleset rank* (the number on the configure page, not the role name) and `GroupAdmin` is the *Discord role name*

- Use the following command to set up giving a role to members lower than a rank in a group: (*Note! This uses a "less than" comparison*)

  `!BindGroupRank 372 GroupNormie <200` where `372` is your *group id*, `200` is the *group roleset rank* (the number on the configure page, not the role name) and `GroupNormie` is the *Discord role name*

- Use the following command to unbind a role from a group:

  `!UnbindGroupRank GroupMember` where `GroupMember` is the *Discord role name*

- Use the following command to unbind all roles from groups in your server:

  `!UnbindAllGroupRanks`

### Virtual groups

Virtual groups are a way to bind ranks using the group rank binding system for external services that aren't actually Roblox groups, such as the dev forum. More could be easily added if you fork this project. Currently, these are in by default:

- `DevForum` - Checks dev forum membership (devforum.roblox.com)
- `HasAsset <asset id>` - Checks if user owns an asset, takes the id as an argument
- `BC` - Builders club
- `TBC`
- `OBC`
- `NBC` - No builders club
- `BuildersClub` - Any form of BC

To create a role for all members of the dev forum in your server, use the following command:

`!BindRank DevForum DevForumMember`, where `DevForum` is the *Virtual Group* and `DevForum Member` is the *Discord role name*

To create a role for all members who own a specific asset, use the following command:

`!BindRank HasAsset Winner 424242`, where `HasAsset` is the *Virtual Group*, `Winner` is the *Discord role name*, and `424242` is the *asset id*

# Self-hosting instructions

1. To get RoVer ready to run locally, the first step is to clone this repository onto the machine you wish to run it on. 
2. **Node.js version 8.0.0 or newer is required to run RoVer.**
3. Install yarn if you don't already have it: `npm install -g yarn`
4. Use yarn to install the dependencies: `yarn install`
5. Edit the file `src/data/client.json` and insert your [bot token](https://discordapp.com/developers/applications/me).
6. Start the bot: `node ./src/index.js`
7. You should set up a process manager like [PM2](http://pm2.keymetrics.io/) or forever.js to ensure that the bot remains online.

### Update Server

The *Update Server* is an optional part of RoVer that can be enabled in `client.json`. It is an HTTP server that can listen for requests and globally update a member in all guilds that the bot is in, similar to if they ran `!verify` in every guild. This is used internally on the hosted version for when the user verifies on verify.eryn.io, but you could use it for whatever purpose you wish. 

### client.json options

```
    "token"             : String. The bot token that is used to log in to your bot.
    "lockNicknames"     : Boolean. Default false. If true, the bot will run DiscordServer.verifyMember every time
                          they begin typing. This will quickly eat up API requests if you aren't careful. Mostly
                          used on the hosted version.
    "updateServer"      : {
                          If this object is present, the update server will be started.
                      
        "port"          : Integer. The port the Update server runs on.
        "apiKey"        : String. The API key the server checks against before updating the user.
    }
    "loud"              : Boolean. Default false. Logs every request made to stdout.
    "totalShards"       : Integer. Default auto. The number of shards to launch.
    "apiRequestMethod"  : String. Default 'sequential'. sequential' or 'burst'. Sequential executes all requests in the order 
                          they are triggered, whereas burst runs multiple at a time, and doesn't guarantee a particular order.
    "owner"             : String. Default "0". The Discord ID of the bot's owner.
    "commandPrefix"     : String. Default "!". The prefix for commands. 
    "shardLifeTime"     : Integer. Number of seconds each shard will run before closing.
    "mainLifeTime"      : Integer. Number of seconds the main process will run before closing. (Need a process manager if you want it to relaunch)
```

# To-do list and plans

- Add more commands for admins for things like fixing name, banning per server by roblox account, and a !whois command
- More cowbell
