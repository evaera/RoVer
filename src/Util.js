/**
 * @module Util
 */
module.exports = {
	/**
	 * Performs string formatting for things like custom nicknames. 
	 * 
	 * @param {string} formatString The string to format (contains replacement strings)
	 * @param {object} data The data to replace the string replacements with
	 * @param {GuildMember} member The guild member this string is being formatted for
	 * @returns {string} The processed string
	 */
	formatDataString(formatString, data, member) {
		let replacements = {
			'%USERNAME%': data.robloxUsername,
			'%USERID%': data.robloxId,
			'%DISCORDNAME%': data.discordName || '',
			'%DISCORDID%': data.discordId || '',
		}

		if (member != null) {
			replacements['%DISCORDNAME%'] = member.user.username
			replacements['%DISCORDID%'] = member.id
		}

		return formatString.replace(/%\w+%/g, (all) => {
			return replacements[all] || all
		})
	}
}