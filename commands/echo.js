const Discord = require('discord.js');
const { useQueue } = require("discord-player");
const { isInVoiceChannel } = require("../utils/voicechannel");

module.exports = {
    name: 'echo',
    description: 'Toggle TTS for your messages in the voice channel.',
    options: [
        {
            name: 'state',
            type: Discord.ApplicationCommandOptionType.String,
            description: 'Set echo state to "on" or "off"',
            required: true,
            choices: [
                { name: 'on', value: 'on' },
                { name: 'off', value: 'off' },
            ],
        },
    ],
    async execute(interaction, client) {
        const inVoiceChannel = isInVoiceChannel(interaction)
        if (!inVoiceChannel) {
            return
        }

        await interaction.deferReply();
        try {
            client.ttsStates.get(interaction.guildId).set(
                interaction.userId, (interaction.options.getString('state') === 'on')
            );
            return void interaction.followUp({
                content: `✅ | [DEBUG] TTS state set to ${interaction.options.getString('state')} (${(interaction.options.getString('state') === 'on')})`,
            });
        } catch (error) {
            return void interaction.followUp({
                content: `❌ | Unexpected error occurred! ${error.message}`,
            });
        }
    }
};
