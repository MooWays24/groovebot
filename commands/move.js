const {GuildMember, ApplicationCommandOptionType} = require('discord.js');
const {useQueue} = require("discord-player");
const {isInVoiceChannel} = require("../utils/voicechannel");

module.exports = {
    name: 'move',
    description: 'move song position in the queue!',
    options: [
        {
            name: 'track',
            type: ApplicationCommandOptionType.Integer,
            description: 'The track number you want to move',
            required: true,
        },
        {
            name: 'position',
            type: ApplicationCommandOptionType.Integer,
            description: 'The position to move it to',
            required: true,
        },
    ],
    async execute(interaction) {
        const inVoiceChannel = isInVoiceChannel(interaction)
        if (!inVoiceChannel) {
            return
        }

        await interaction.deferReply();
        const queue = useQueue(interaction.guild.id)

        if (!queue || !queue.currentTrack)
            return void interaction.followUp({content: '❌ | No music is being played!'});

        const queueNumbers = [interaction.options.getInteger('track') - 1, interaction.options.getInteger('position') - 1];

        if (queueNumbers[0] > queue.tracks.size || queueNumbers[1] > queue.tracks.size)
            return void interaction.followUp({content: '❌ | Track number greater than queue depth!'});

        try {
            const track = queue.node.remove(queueNumbers[0]);
            if (track) {
                queue.node.insert(track, queueNumbers[1]);
                return void interaction.followUp({
                    content: `✅ | Moved **${track}**!`,
                });
            } else {
                return void interaction.followUp({
                    content: '❌ | Could not find the track to move!',
                });
            }
        } catch (error) {
            console.log(error);
            return void interaction.followUp({
                content: '❌ | Something went wrong!',
            });
        }
    },
};
