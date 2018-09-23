---
layout: white
---
# Jump Start Guide
The quickest and easiest way to use RoVer is to [add the hosted version](https://discordapp.com/oauth2/authorize?client_id=298796807323123712&scope=bot&permissions=402656264) to your server. These are all optional:

1. Create a role - it can be called anything, but most name it "Verified" - that will be given to all verified users.
2. Run the command `!VerifiedRole Verified`, replacing "Verified" with what your role is called.
3. Modify your channel permissions so that only those with the "Verified" role can speak or see them.
4. Run the command `!CreateVerifyChannel`, which will create a channel category to give instructions to new members of your server.

You can also [bind groups](#integrating-with-roblox-groups) or [other resources](#virtual-groups) to roles. Or if you want to see how to customize everything, just keep reading...

# What is it?

RoVer is an open source, drop-in Discord verification bot that will allow your members to safely authenticate their Roblox account on your Discord server. This empowers your Roblox community with the following advantages:

- Speak with confidence, because everyone is who their name says they are.
- Adding an extra step between trolls & spammers and your server will drastically reduce unwanted activity.
- Integrate closely with Roblox groups, showing ranks and giving roles based on group membership.
- The verification database is already populated with hundreds of thousands of Discord-Roblox account links, so it's possible users will already be verified when they join your server.
- The official version of RoVer can handle bigger servers and will automatically be able to update roles the second a user verifies. (If you host RoVer yourself, the user will have to run a command in order for the verification to take place.)

# How does it work?

RoVer is the official Discord bot for the [verify.eryn.io](https://verify.eryn.io) verification registry. RoVer uses its [public API](https://verify.eryn.io/api), so this API is available to you in your own projects as well.

With over 650,000 accounts linked already, it's likely many of your users will already be verified and will have to take no new steps. For brand new users, the process looks something like this:
1. The user signs in with their Discord account.
2. The user chooses how they want to verify: by joining a Roblox game, or by adding a code to their profile.
3. The user is verified and can participate in your community.

# Using RoVer

When a user joins your server, the bot will automatically check if they are already in our database, and if so, they will be verified immediately. If they are not already in the database, they will be instructed to go to the verification website to verify themselves. If you are using the hosted version of the bot, then the user will automatically be given the verified state after they verify on the website. **However**, if you are hosting the bot yourself, the user will have to run the `!verify` command in order for the bot to check if they are verified.

You should probably make a read-only channel in the server explaining these processes to your members. (You can do this automatically with the !CreateVerifyChannel command). After you add the bot to your server, you can customize RoVer with the following commands. You must have the `Manage Server` permission or a role named "RoVer Admin" in the Discord server in order to use these commands.

**Please note** that the "RoVer" role must be above any other roles that you want RoVer to act on. Anyone with a role that's above the RoVer role will not be able to be verified. This is just how the Discord permission system works, so please make sure to account for it!

## Commands
**Note**: &lt;angled brackets&gt; denote *required* arguments, and [square brackets] denote *optional* arguments. They should not be included when you run the command.

You can run any of the commands that have all optional arguments by themselves to set them back to their default state.
### Server Configuration
#### Nickname configuration
- `!Nickname <on|off>` - Set whether or not new users will be nicknamed to their Roblox name. Default `on`.
- `!NicknameFormat [format]` - Set the nickname format, so you could have the nickname include their roblox id or discord name, for example. Available replacements are `%USERNAME%`, `%USERID%`, `%SERVER%`, `%RANK%`, `%DISCORDNAME%`, and `%DISCORDID%`. Example: `%USERNAME% - (%USERID%)`. Default `%USERNAME%`.
- `!NicknameGroup [group_id]` - The group ID to use for the %RANK% replacement in nicknames. This allows you to make your usernames look like [this](https://i.imgur.com/4VA1vq9.png). Note that if your group rank name on Roblox.com starts with something in brackets like "[PVT] Private", only the "[PVT]" will be used for the nickname. Otherwise, the entire rank name is used. Default `null`.
#### Channel configuration
- `!AnnounceChannel [channel]` - Set a channel that the bot will post a message to every time someone verifies. Default `null`.
- `!VerifyChannel [channel]` - Set a channel that the bot will delete all messages in except for verification messages. Default `null`.
- `!CreateVerifyChannel` Creates a channel category with verification instructions for new members and a channel for users to verify themselves.
#### Other
- `!JoinDM <on|off>` Set whether or not new users will be automatically direct messaged with verification instructions when joining this server. Default `on`.
- `!WelcomeMessage [welcome message]` - Set the message the user gets when they verify. Will be sent in DMs unless they use `!verify` command. Available replacements are `%USERNAME%`, `%USERID%`, `%SERVER%`, `%DISCORDNAME%`, and `%DISCORDID%`. Default `Welcome to %SERVER%, %USERNAME%!`.
- `@RoVer prefix [prefix]` - Change the command prefix. (Default: `!`)

### Ranks
- `!VerifiedRole [exact role name]` - Set the role that verified members will get. Default `null`.
- `!UnverifiedRole [exact role name]` - Set the role that non-verified members will get. Default `null`.
- `!Bind <"exact role name"> <group_id>:<rank_id> [<group_id>:<rank_id>]...` Binds Roblox group membership or group rank to a Discord role. Put the Discord role name in quotes. Please see [Integrating with Roblox Groups](#integrating-with-roblox-groups).
- `!Unbind <exact role name>` - Unbinds this role from any group ranks.
- `!UnbindAll` - Removes all group bindings configured for this server.
- `!Bindings` - Shows a list of all bound roles.
- `!CreateGroupRanks <group_id>` - Creates Discord roles from all of the roles in a given group, and then binds them to the group. (If a role already exists with a name matching a group rank, that role will be used instead of creating a new one.)

### Help and Support
- `!RoVer` - Displays a description of RoVer.
- `!Help` - Displays a list of commands.
- `!Support` - Posts a link to the official RoVer Discord server
- `!Invite` - Posts an invite link for RoVer.

### User administration
- `!Update <@user>` - Forcibly update verification status of a user, same as them running `!verify`. Requires "Manage Server" or a role named "RoVer Updater".

### User commands
- `!Whois <@user>` - Get a link to a verified user's profile.
- `!Verify` - Verifies the user who runs this command.

## Magic Roles
Magic roles are special role names that can give specific users in your server special power. There are no commands needed to use these, all you need to do is create a role in your server matching these exact names and assign them to users. These roles are checked for by name exactly, so if you create these roles on your server, ensure that they are spelled and capitalized exactly the same as they appear below.

- `RoVer Bypass` - RoVer will ignore users with a role called "RoVer Bypass", so you can give them custom names or give people a member role when they aren't actually verified or in a group.
- `RoVer Admin` - RoVer will allow anyone with a role called "RoVer Admin" to run any of the server commands, even if they don't have Manage Server.
- `RoVer Updater` - You can also give users a role called "RoVer Updater", which will let the holder of that role run !update on others, but no other admin commands.

## Integrating with Roblox Groups
Group bindings can be created to keep Discord roles up to date with Roblox group ranks. RoVer does not support or plan to support changing group ranks or shouts on Roblox.com, and you should be wary of any bots that offer this functionality, as this introduces a major security risk.

Group bindings can be created with the `!Bind` command.
- The first argument in the Bind command is the Discord role name.
  - This needs to be in quotation marks if it has spaces
- After that, you can pass an unlimited amount of groups with a list of ranks for each group.
  - The groups are in the format `<group_id>:<rank_number>` (e.g. `372372:135`).
    - You can find the Roblox group ranks for each role in a Roblox group on the Roblox group admin > roles page; it is a number between 1 and 255.
    - You can provide a list of ranks, like `<groupid>:<rank>,<rank>,<rank>` (e.g. `372372:135,150,250`).
    - You can provide a range of ranks instead of listing them out, like `1-130`, e.g. (`372372:1-130,255`, which will count for anyone who has a rank between 1 and 130 [inclusive] or the rank 255).
     - You can also bind the rank `0` to bind rank for people who are *not* in the group.
  - If the user meets the requirements for *any* of the groups, they will be considered to have the role.

See more examples below:

**Note**: You need to put the Discord role name in quotation marks if it has spaces. If you don't do this you will get unexpected results.

- Use the following command to set up giving a role to all members of a group:

  `!Bind "Group Member" 372372` where `372372` is your *group id* and `Group Member` is the *Discord role name*

- Use the following command to set up giving a role to members of a certain rank in a group:

  `!Bind "Group Owner" 372372:255` where `372372` is your *group id*, `255` is the *group roleset rank* (the number on the Roblox group configure page, not the role name) and `Group Owner` is the *Discord role name*

- Use the following command to set up giving a role to members of a **certain range** of rank in a group:

  `!Bind "High Rank" 372372:200-254` where `372372` is your *group id*, `200-254` is a range of numbers corresponding to the *group roleset rank* (the number on the Roblox group configure page, not the role name) and `High Rank` is the *Discord role name*

- Use the following command to set up giving a role to a specific set of ranks in a group:

  `!Bind "Group Leaders" 372372:50,100-150,200` - This will bind a rank for users with a rank 50, anywhere from 100 to 150 (including 111, 122, etc), and the rank 200

- Use the following command to set up giving a role to a user who meets the requirements in any of a list of groups

  `!Bind "Faction Leader" 372372:250 372838:255 29393:250-255` - This will give the user the `Faction Leader` Discord role when they are rank 250 in the first group, *or* rank 255 in the second group, *or* ranks 250 through 255 in the last group.

- Use the following command to unbind a role from a group:

  `!Unbind Group Member` where `Group Member` is the *Discord role name*

- Use the following command to unbind all roles from groups in your server:

  `!UnbindAll`

### Virtual groups

Virtual groups are a way to bind ranks using the group rank binding system for external services that need not be Roblox groups, such as the developer forum. Currently, these are available by default:

- `DevForum` - DevForum full membership (devforum.roblox.com)
- `DevForumBasic` - DevForum basic user
- `DevForumAccess` - DevForum access (either full membership or basic user)
- `GamePass:<gamepass_id>` -  Binds ownership of a game pass, takes the id as an argument
- `Badge:<badge_id>` - Binds ownership of a badge, takes the id as an argument
- `Asset:<asset_id>` - Binds ownership of an asset, takes the id as an argument
- `Friend:<user_id>` - Binds being a friend to the given user on Roblox
- `BC` - Builders club
- `TBC`
- `OBC`
- `NBC` - No builders club
- `BuildersClub` - Any form of BC
- `Clan:<group_id>` - Clan membership
- `Ally:<group_id>`* - Binds being in a group that is allied to group_id
- `Enemy:<group_id>`* - Binds being in a group that is an enemy of to group_id

<small>* indicates a heavily-cached resource that cannot be manually cleared. The cache will expire every two hours on the official version.</small>

To create a role for all members of the dev forum in your server, use the following command:

`!Bind DevForumMember DevForum`, where `DevForum` is the *Virtual Group* and `DevForum Member` is the *Discord role name*

To create a role for all members who own a specific asset, use the following command:

`!Bind Winner HasAsset:424242`, where `HasAsset` is the *Virtual Group*, `Winner` is the *Discord role name*, and `424242` is the *asset id*

To create a role for all members who are either in the DevForum, have OBC, or is in group 372372 as an owner:

`!Bind DevForumOrOBC DevForum OBC 372372:255`

### Ranks in nicknames

If you want users' group ranks to appear in their nickname, like "[PVT] evaera", follow these steps:

- Ensure the RANK is present somewhere in the nickname format: `!NicknameFormat %RANK% %USERNAME%`
- Configure the group id to be used for the ranks: `!NicknameGroup 372372`
- RoVer will automatically pick up on rank labels, so if the group rank is named "[PVT] Private", RoVer will only use the "[PVT]" for the nickname. If there is no label in the rank name, then RoVer will use the entire rank name instead.