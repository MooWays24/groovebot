const { ApplicationCommandOptionType } = require('discord.js');
const { useMainPlayer, QueryType } = require('discord-player');
const { isInVoiceChannel } = require('../utils/voicechannel');

module.exports = {
    name: 'playfile',
    description: 'Upload an audio file and play it in your voice channel',
    options: [
        {
            name: 'file',
            type: ApplicationCommandOptionType.Attachment,
            description: 'The audio file you want to play',
            required: true,
        },
        {
            name: 'title',
            type: ApplicationCommandOptionType.String,
            description: 'The title of the track',
            required: false,
        },
        {
            name: 'artist',
            type: ApplicationCommandOptionType.String,
            description: 'The artist of the track',
            required: false,
        },
    ],
    async execute(interaction) {
        try {
            // Check if the user is in a voice channel
            if (!isInVoiceChannel(interaction)) {
                return;
            }

            await interaction.deferReply();

            const player = useMainPlayer();
            const attachment = interaction.options.getAttachment('file');
            const title = interaction.options.getString('title') || attachment.name;
            const artist = interaction.options.getString('artist') || 'Unknown Artist';

            // Validate the file type
            const validExtensions = ['.mp3', '.wav', '.flac', '.ogg', '.m4a'];
            const fileExtension = require('path').extname(attachment.name).toLowerCase();

            if (!validExtensions.includes(fileExtension)) {
                return void interaction.followUp({
                    content: '❌ | Unsupported file format! Please upload an audio file (MP3, WAV, FLAC, OGG, M4A).',
                });
            }

            // Use the attachment URL directly
            const query = attachment.url;

            // Search for the attachment URL
            const searchResult = await player.search(query, {
                requestedBy: interaction.user,
                searchEngine: QueryType.AUTO,
            });

            if (!searchResult.hasTracks()) {
                return void interaction.followUp({ content: '❌ | Could not play the file!' });
            }

            // Modify the track's metadata
            const track = searchResult.tracks[0];
            track.title = title;
            track.author = artist;

            // Play the track
            await player.play(interaction.member.voice.channel.id, track, {
                nodeOptions: {
                    metadata: {
                        channel: interaction.channel,
                        client: interaction.guild?.members.me,
                        requestedBy: interaction.user.username,
                    },
                    leaveOnEmptyCooldown: 300000,
                    leaveOnEmpty: true,
                    leaveOnEnd: false,
                    bufferingTimeout: 0,
                },
            });

            await interaction.followUp({
                content: `⏱ | Loading your track: **${title}** by **${artist}**...`,
            });

        } catch (error) {
            console.error(error);
            await interaction.followUp({
                content: 'There was an error trying to execute that command: ' + error.message,
            });
        }
    },
};
