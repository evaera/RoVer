const Command = require('../Command')

module.exports =
class NicknameFormatCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'nicknameformat',
			aliases: ['rovernicknameformat'],
			description: '`<format>` Set the nickname format, so you could have the nickname include their roblox id or discord name, for example. Available replacements are Available replacements are %USERNAME%, %USERID%, %DISCORDNAME%, and %DISCORDID%. Example: %USERNAME% - (%USERID%). Default `%USERNAME%`.',

			args: [
				{
					key: 'format',
					label: 'format',
					prompt: 'Nickname format',
					type: 'string',
					infinite: true,
					default: false
				}
			]
		})
	}

	fn(msg, args) {
		if (args.format) {
			args.format = args.format.join(' ')
			this.server.setSetting('nicknameFormat', args.format)
			msg.reply(`Set nickname format to \`${args.format}\``)
		} else {
			this.server.setSetting('nicknameFormat', undefined)
			msg.reply('Nickname format set back to default')
		}
	}
}