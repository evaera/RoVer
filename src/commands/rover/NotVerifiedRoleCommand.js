const Command = require('../Command')

module.exports =
class NotVerifiedRoleCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'notverifiedrole',
			aliases: ['roververifiedremovedrole', 'verifiedremovedrole', 'rovernotverifiedrole'],
			description: '`<Discord Role>` Set the role that members will lose when verified successfully. Default none',

			args: [
				{
					key: 'role',
					label: 'role',
					prompt: 'What role should non-verified users get?',
					type: 'role',
					default: false,
				}
			]
		})
	}

	fn(msg, args) {
		let role = args.role
		if (role) {
			if (this.server.isRoleInUse(role.id)) {
				msg.reply('That role is already in use. (verified role, not verified role, or from a group binding). Run `!bindings` to see all role bindings.')
			} else {
				this.server.setSetting('verifiedRemovedRole', role.id)
				msg.reply(`Set non-verified role to ${role.name}`)
			}
		} else {
			this.server.setSetting('verifiedRemovedRole', null)
			msg.reply('Cleared removed verification role, users will no longer be removed from it on verification.')
		}
	}
}
