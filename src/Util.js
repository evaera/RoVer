const crypto = require('crypto')

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
  formatDataString (formatString, data, member) {
    let replacements = {
      '%USERNAME%': data.robloxUsername,
      '%USERID%': data.robloxId,
      '%DISCORDNAME%': data.discordName || '',
      '%DISCORDID%': data.discordId || ''
    }

    if (member != null) {
      replacements['%DISCORDNAME%'] = member.user.username
      replacements['%DISCORDID%'] = member.id
      replacements['%SERVER%'] = member.guild.name
    }

    return formatString.replace(/%\w+%/g, (all) => {
      return replacements[all] || all
    })
  },

  /**
   * Returns a promise that resolves after the given time in milliseconds.
   * @param {int} sleepTime The amount of time until the promise resolves
   * @returns Promise
   */
  async sleep (sleepTime) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve()
      }, sleepTime)
    })
  },

  /**
   * Takes an array of numbers and simplifies it into a string containing ranges, e.g.:
   * [0, 1, 2, 4, 6, 7, 8] --> "0-2, 4, 6-8"
   * @param {array} numbers The input numbers
   * @returns {string} The output string
   */
  simplifyNumbers (numbers) {
    let output = []
    let rangeStart
    for (let i = 0; i < numbers.length; i++) {
      let number = numbers[i]
      let next = numbers[i + 1]

      if (rangeStart != null && (next - number !== 1 || next == null)) {
        output.push(`${rangeStart}-${number}`)
        rangeStart = null
      } else if (next == null || next - number !== 1) {
        output.push(`${number}`)
      } else if (rangeStart == null) {
        rangeStart = number
      }
    }

    return output.join(', ')
  },

  md5 (string) {
    return crypto.createHash('md5').update(string).digest('hex')
  }
}
