const { GuildMember } = require('discord.js');
const { useQueue } = require('discord-player');
const { isInVoiceChannel } = require('../utils/voicechannel');

module.exports = {
    name: 'pause',
    description: 'Pause or resume the current song!',
    async execute(interaction) {
        const inVoiceChannel = isInVoiceChannel(interaction);
        if (!inVoiceChannel) {
            return;
        }

        await interaction.deferReply();
        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.currentTrack)
            return void interaction.followUp({
                content: '❌ | No music is being played!',
            });

        if (queue.node.isPaused()) {
            const success = queue.node.resume();
            return void interaction.followUp({
                content: success ? '▶️ | Resumed!' : '❌ | Something went wrong!',
            });
        } else {
            const success = queue.node.pause();
            return void interaction.followUp({
                content: success ? '⏸ | Paused!' : '❌ | Something went wrong!',
            });
        }
    },
};
