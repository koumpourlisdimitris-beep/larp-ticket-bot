const {
    Client,
    GatewayIntentBits,
    ChannelType,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Events
} = require('discord.js');

// ================================
// CONFIGURATION
// ================================

// Your Discord bot token will be provided through
// the DISCORD_TOKEN environment variable.
const TOKEN = process.env.DISCORD_TOKEN;

// Your 🎫・create-ticket channel ID
const TICKET_PANEL_CHANNEL_ID = '1540735020061171782';

// Your 🎫 TICKETS category ID
const TICKET_CATEGORY_ID = '1540734855497912450';

// ================================
// CHECK TOKEN
// ================================

if (!TOKEN) {
    console.error('❌ DISCORD_TOKEN is missing.');
    console.error('Set the DISCORD_TOKEN environment variable before starting the bot.');
    process.exit(1);
}

// ================================
// CLIENT
// ================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

// ================================
// BOT READY
// ================================

client.once(Events.ClientReady, async (bot) => {
    console.log(`✅ Logged in as ${bot.user.tag}`);

    try {
        const channel = await bot.channels.fetch(TICKET_PANEL_CHANNEL_ID);

        if (!channel) {
            console.error('❌ Ticket panel channel not found.');
            return;
        }

        const button = new ButtonBuilder()
            .setCustomId('create_ticket')
            .setLabel('Create Ticket')
            .setEmoji('🎫')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder()
            .addComponents(button);

        await channel.send({
            content:
                '🎫 **LARP Support**\n\n' +
                'Need help? Click the button below to create a private ticket.',
            components: [row]
        });

        console.log('✅ Ticket panel sent.');

    } catch (error) {
        console.error('❌ Could not send ticket panel:', error);
    }
});

// ================================
// BUTTON HANDLER
// ================================

client.on(Events.InteractionCreate, async (interaction) => {

    if (!interaction.isButton()) return;

    if (interaction.customId !== 'create_ticket') return;

    try {
        // Respond immediately so Discord doesn't say
        // "This interaction failed".
        await interaction.deferReply({
            ephemeral: true
        });

        const guild = interaction.guild;

        if (!guild) {
            return interaction.editReply({
                content: '❌ This button can only be used inside a server.'
            });
        }

        // Check if the user already has a ticket.
        const existingTicket = guild.channels.cache.find(
            channel => channel.name === `ticket-${interaction.user.id}`
        );

        if (existingTicket) {
            return interaction.editReply({
                content: `❌ You already have a ticket: ${existingTicket}`
            });
        }

        // Create the private ticket channel.
        const ticketChannel = await guild.channels.create({
            name: `ticket-${interaction.user.id}`,
            type: ChannelType.GuildText,
            parent: TICKET_CATEGORY_ID,

            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,

                    deny: [
                        PermissionFlagsBits.ViewChannel
                    ]
                },

                {
                    id: interaction.user.id,

                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                },

                {
                    id: client.user.id,

                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.ManageChannels
                    ]
                }
            ]
        });

        // Welcome message.
        await ticketChannel.send({
            content:
                `🎫 **Ticket Created**\n\n` +
                `Welcome ${interaction.user}!\n\n` +
                `Please describe your issue and a staff member will help you.`
        });

        // Tell the user their ticket was created.
        await interaction.editReply({
            content: `✅ Your ticket has been created: ${ticketChannel}`
        });

        console.log(
            `✅ Ticket created: ${ticketChannel.name}`
        );

    } catch (error) {

        console.error('❌ TICKET ERROR:', error);

        try {
            if (interaction.deferred) {
                await interaction.editReply({
                    content:
                        '❌ I could not create your ticket. ' +
                        'Please check the bot permissions.'
                });
            }
        } catch (replyError) {
            console.error(
                '❌ Could not send error message:',
                replyError
            );
        }
    }
});

// ================================
// LOGIN
// ================================

client.login(TOKEN).catch((error) => {
    console.error('❌ LOGIN ERROR:', error);
});