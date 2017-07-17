module.exports = {
    // Performs string formatting for things like
    // custom nicknames. 
    formatDataString(formatString, data, member) {
        let replacements = {
            "%USERNAME%": data.robloxUsername,
            "%USERID%": data.robloxId,
            "%DISCORDNAME%": data.discordName || "",
            "%DISCORDID%": data.discordId || "",
        }

        if (member != null) {
            replacements["%DISCORDNAME%"] = member.user.username;
            replacements["%DISCORDID%"] = member.id;
        }

        return formatString.replace(/%\w+%/g, (all) => {
            return replacements[all] || all;
        });
    }
}