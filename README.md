<p align="center">
    <a href="https://eryn.io/RoVer/"><img src="http://i.imgur.com/j1jxb5F.png" alt="RoVer" /></a>
</p>

<p align="center">
    <a href="https://discordapp.com/oauth2/authorize?client_id=298796807323123712&scope=bot&permissions=402656264"><img src="http://i.imgur.com/8UBldnL.png" alt="Add" /></a>
</p>

[![Patreon](http://i.imgur.com/dujYlAK.png)](https://www.patreon.com/erynlynn) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com) [![Verified Users](https://img.shields.io/badge/verified%20users-130K%2B-brightgreen.svg)](https://eryn.io/RoVer)
[![Discord](https://img.shields.io/discord/321647685629378561.svg)](https://discord.gg/UgrYcCS)

# What is it?

RoVer is an open source, drop-in verification bot that will allow your members to safely authenticate their Roblox account on your Discord server. This empowers your Roblox community with the following advantages:

- Speak with confidence, because everyone is who their name says they are.
- Adding an extra step between trolls & spammers and your server will reduce unwanted activity drastically.
- The verification database is already populated with thousands of Discord-Roblox account links, so it's possible users will already be verified when they join your server.
- The hosted version of RoVer does not have any API rate limiting and will automatically be able to update roles the second the user verifies. (If you host RoVer yourself, the user will have to run a command in order for the verification to take place.)

# How does it work?

RoVer uses the same verification system used by the [Roblox Community Discord](http://rbx.community) server, a web app that lives at [verify.eryn.io](https://verify.eryn.io). RoVer makes use of its [public API](https://verify.eryn.io/api).

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

After you add the bot to your server, you can customize RoVer with the following commands. You must have the `Manage Server` permission in the Discord server in order to use these commands.

- `!RoVer` - Displays a list of commands
- `!VerifiedRole <exact role name>` - Set the role that verified members will get. Default `null`.
- `!NotVerifiedRole <exact role name>` - Set the role that non-verified members will get. Default `null`.
- `!Nickname <true|false>` - Set whether or not new users will be nicknamed to their Roblox name. Default `true`.
- `!AnnounceChannel <exact channel name>` - Set a channel that the bot will post a message to every time someone verifies. Default `null`.
- `!NicknameFormat <format>` - Set the nickname format, so you could have the nickname include their roblox id or discord name, for example. Available replacements are Available replacements are `%USERNAME%`, `%USERID%`, `%SERVER`, `%DISCORDNAME%`, and `%DISCORDID%`. Example: `%USERNAME% - (%USERID%)`. Default `%USERNAME%`.
- `!WelcomeMessage <welcome message>` - Set the message the user gets when they verify. Will be sent in DMs unless they use `!verify` command. Available replacements are `%USERNAME%`, `%USERID%`, `%SERVER`, `%DISCORDNAME%`, and `%DISCORDID%`. Default: `Welcome to the server, %USERNAME%!`.
- `!BindRank <"Discord Role"> <group_id>:<rank_id>` Binds Roblox group membership or group rank to a Discord role. Put the Discord role name in quotes. See section below for details.
- `!Unbind <role name>` - Unbinds this role from any group ranks.
- `!UnbindAll` - Removes all group bindings configured for this server.
- `!Update <@user>` - Forcibly update verification status of a user, same as them running `!verify`. Make sure you @mention the user.
- `!Whois <@user>` - Get a link to a verified user's profile.

You can run these commands without arguments to set them back to their default state.

When a user joins your server, the bot will automatically check if they are already in our database, and if so, they will be verified immediately. If they are not already in the database, they will be instructed to go to the verification website to verify themselves. If you are using the hosted version of the bot, then the user will automatically be given the verified state after they verify on the website. **However**, if you are hosting the bot yourself, the user will have to run the `!verify` command in order for the bot to check if they are verified.

You should probably make a read-only channel in the server explaining these processes to your members.

RoVer will ignore users with a role called "RoVer Bypass", so you can give them custom names or give people a member role when they aren't actually verified or in a group.

## Setting up roles for Roblox group members and group ranks
Group bindings can be created to keep Discord roles up to date with Roblox group ranks. You can find the Roblox group ranks for each role in a Roblox group on the Roblox group admin > roles page; it is a number between 1 and 255.

The first argument is the Discord role name (which needs to be in quotation marks if it has spaces). After that, you can pass an unlimited amount of groups with a list of ranks for each group. If the user meets the requirements for *any* of these groups, they will be considered to have the role. The groups are in the format `<groupid>:<rank>` (e.g. `372372:135`). You can also provide a list of ranks, like `<groupid>:<rank>,<rank>,<rank>` (e.g. `372372:135,150,250`). You can also provide a range of ranks instead of listing them out, like `1-130`, e.g. (`372372:1-130,255`, which will count for anyone who has a rank between 1 and 130 [inclusive] or the rank 255). You can also bind the rank `0` to bind rank for people who are *not* in the group.

See more examples below:

**Note**: You need to put the Discord role name in quotation marks if it has spaces. If you don't do this you will get unexpected results.

- Use the following command to set up giving a role to all members of a group:

  `!BindRank "Group Member" 372372` where `372372` is your *group id* and `GroupMember` is the *Discord role name*

- Use the following command to set up giving a role to members of a certain rank in a group:

  `!BindRank "Group Owner" 372372:255` where `372372` is your *group id*, `255` is the *group roleset rank* (the number on the Roblox group configure page, not the role name) and `Group Owner` is the *Discord role name*

- Use the following command to set up giving a role to members of a **certain range** of rank in a group:

  `!BindRank "High Rank" 372372:200-254` where `372372` is your *group id*, `200-254` is a range of numbers corresponding to the *group roleset rank* (the number on the Roblox group configure page, not the role name) and `High Rank` is the *Discord role name*

- Use the following command to set up giving a role to a specific set of ranks in a group:

  `!BindRank "Group Normie" 372372:50,100-150,200` - This will bind a rank for users with a rank 50, anywhere from 100 to 150 (including 111, 122, etc), and the rank 200

- Use the following command to set up giving a role to a user who meets the requirements in any of a list of groups

  `!BindRank "Faction Leader" 372372:250 372838:255 29393:250-255` - This will give the user the `Faction Leader` Discord role when they are rank 250 in the first group, *or* rank 255 in the second group, *or* ranks 250 through 255 in the last group.

- Use the following command to unbind a role from a group:

  `!Unbind Group Member` where `Group Member` is the *Discord role name*

- Use the following command to unbind all roles from groups in your server:

  `!UnbindAllGroupRanks`

### Virtual groups

Virtual groups are a way to bind ranks using the group rank binding system for external services that aren't actually Roblox groups, such as the dev forum. More could be easily added if you fork this project. Currently, these are in by default:

- `DevForum` - DevForum full membership (devforum.roblox.com)
- `DevForumBasic` - DevForum basic user
- `DevForumAccess` - DevForum access (either full membership or basic user)
- `HasAsset <asset id>` - Checks if user owns an asset, takes the id as an argument
- `BC` - Builders club
- `TBC`
- `OBC`
- `NBC` - No builders club
- `BuildersClub` - Any form of BC

To create a role for all members of the dev forum in your server, use the following command:

`!BindRank DevForumMember DevForum`, where `DevForum` is the *Virtual Group* and `DevForum Member` is the *Discord role name*

To create a role for all members who own a specific asset, use the following command:

`!BindRank Winner HasAsset:424242`, where `HasAsset` is the *Virtual Group*, `Winner` is the *Discord role name*, and `424242` is the *asset id*

To create a role for all members who are either in the DevForum, have OBC, or is in group 372372 as an owner:

`!BindRank DevForumOrOBC DevForum OBC 372372:255`

# Self-hosting instructions

1. To get RoVer ready to run locally, the first step is to clone this repository onto the machine you wish to run it on.
2. **Node.js version 8.9.4 LTS or newer is recommended to run RoVer.**
3. [Install yarn](https://yarnpkg.com/lang/en/docs/install/) if you don't already have it
4. Use yarn to install the dependencies from the project folder: `yarn install`
5. Edit the file `src/data/client.json` and insert your [bot token](https://discordapp.com/developers/applications/me).
6. Start the bot from the project folder: `node ./src/index.js`
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
