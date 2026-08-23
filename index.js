const {
    Client,
    GatewayIntentBits,
    ChannelType,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
    Events,
    ActivityType,
    MessageFlags
} = require("discord.js");

// ==========================================
// CONFIGURATION
// ==========================================

const TOKEN = process.env.DISCORD_TOKEN;

const TICKET_PANEL_CHANNEL_ID = 1541034126017171476;

const TICKET_CATEGORY_ID = 1541033963651465266;

const SUPPORT_ROLE_ID = "1517358979179876384";

// ==========================================
// TOKEN CHECK
// ==========================================

if (!TOKEN) {
    console.error("DISCORD_TOKEN is missing.");
    process.exit(1);
}

// ==========================================
// CLIENT
// ==========================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

// ==========================================
// UPDATE BOT ACTIVITY
// ==========================================

async function updateTicketActivity() {
    try {
        const category = await client.channels.fetch(
            TICKET_CATEGORY_ID
        );

        if (!category || !category.guild) {
            return;
        }

        const ticketCount = category.guild.channels.cache.filter(
            channel =>
                channel.parentId === TICKET_CATEGORY_ID &&
                channel.name.startsWith("ticket-")
        ).size;

        client.user.setActivity(
            "Handling " + ticketCount + " tickets",
            {
                type: ActivityType.Playing
            }
        );

        console.log(
            "Ticket activity updated: Handling " +
            ticketCount +
            " tickets"
        );

    } catch (error) {
        console.error(
            "Could not update ticket activity:",
            error
        );
    }
}

// ==========================================
// SUPPORT STAFF CHECK
// ==========================================

function isSupportStaff(interaction) {
    return interaction.member &&
        interaction.member.roles &&
        interaction.member.roles.cache.has(SUPPORT_ROLE_ID);
}

// ==========================================
// BOT READY
// ==========================================

client.once(Events.ClientReady, async (bot) => {

    console.log(
        "Logged in as " +
        bot.user.tag
    );

    await updateTicketActivity();

    try {

        const channel = await bot.channels.fetch(
            TICKET_PANEL_CHANNEL_ID
        );

        if (!channel) {
            console.error(
                "Ticket panel channel was not found."
            );
            return;
        }

        const openButton = new ButtonBuilder()
            .setCustomId("open_ticket")
            .setLabel("Open Ticket")
            .setEmoji("\uD83C\uDFAB")
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder()
            .addComponents(openButton);

        await channel.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle("Support Tickets")
                    .setDescription(
                        "Need help?\n\n" +
                        "Click the button below to open a private support ticket."
                    )
                    .setColor(0x5865F2)
            ],
            components: [
                row
            ]
        });

        console.log(
            "Ticket panel sent."
        );

    } catch (error) {

        console.error(
            "Could not send ticket panel:",
            error
        );
    }
});

// ==========================================
// INTERACTIONS
// ==========================================

client.on(
    Events.InteractionCreate,
    async (interaction) => {

        // ======================================
        // OPEN TICKET BUTTON
        // ======================================

        if (
            interaction.isButton() &&
            interaction.customId === "open_ticket"
        ) {

            const modal = new ModalBuilder()
                .setCustomId("open_ticket_modal")
                .setTitle("Open Support Ticket");

            const reasonInput = new TextInputBuilder()
                .setCustomId("ticket_reason")
                .setLabel(
                    "What is the reason for opening a ticket?"
                )
                .setPlaceholder(
                    "Describe the issue or problem."
                )
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(true)
                .setMaxLength(1000);

            const usernameInput = new TextInputBuilder()
                .setCustomId("roblox_username")
                .setLabel(
                    "What is your Roblox username?"
                )
                .setPlaceholder(
                    "Your Roblox username"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(100);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(reasonInput),

                new ActionRowBuilder()
                    .addComponents(usernameInput)
            );

            await interaction.showModal(
                modal
            );

            return;
        }

        // ======================================
        // CLAIM TICKET
        // ======================================

        if (
            interaction.isButton() &&
            interaction.customId === "claim_ticket"
        ) {

            if (!isSupportStaff(interaction)) {

                return interaction.reply({
                    content:
                        "Only members of the Support Team can claim tickets.",

                    flags:
                        MessageFlags.Ephemeral
                });
            }

            const channel =
                interaction.channel;

            if (!channel) {

                return interaction.reply({
                    content:
                        "Ticket channel was not found.",

                    flags:
                        MessageFlags.Ephemeral
                });
            }

            if (
                channel.topic &&
                channel.topic.startsWith(
                    "CLAIMED_BY:"
                )
            ) {

                const claimedUserId =
                    channel.topic.substring(
                        "CLAIMED_BY:".length
                    );

                return interaction.reply({
                    content:
                        "This ticket has already been claimed by <@" +
                        claimedUserId +
                        ">.",

                    flags:
                        MessageFlags.Ephemeral
                });
            }

            try {

                await channel.setTopic(
                    "CLAIMED_BY:" +
                    interaction.user.id
                );

                const claimButton =
                    new ButtonBuilder()
                        .setCustomId(
                            "claim_ticket"
                        )
                        .setLabel(
                            "Claimed by " +
                            interaction.user.username
                        )
                        .setEmoji(
                            "\uD83D\uDC64"
                        )
                        .setStyle(
                            ButtonStyle.Success
                        )
                        .setDisabled(true);

                const closeButton =
                    new ButtonBuilder()
                        .setCustomId(
                            "close_ticket"
                        )
                        .setLabel(
                            "Close Ticket"
                        )
                        .setEmoji(
                            "\uD83D\uDD12"
                        )
                        .setStyle(
                            ButtonStyle.Danger
                        );

                const row =
                    new ActionRowBuilder()
                        .addComponents(
                            claimButton,
                            closeButton
                        );

                await interaction.update({
                    components: [
                        row
                    ]
                });

                await channel.send({
                    content:
                        "Ticket claimed by " +
                        interaction.user
                });

            } catch (error) {

                console.error(
                    "CLAIM ERROR:",
                    error
                );

                if (!interaction.replied) {

                    await interaction.reply({
                        content:
                            "I could not claim this ticket.",

                        flags:
                            MessageFlags.Ephemeral
                    });
                }
            }

            return;
        }

        // ======================================
        // CLOSE TICKET BUTTON
        // ======================================

        if (
            interaction.isButton() &&
            interaction.customId === "close_ticket"
        ) {

            if (!isSupportStaff(interaction)) {

                return interaction.reply({
                    content:
                        "Only members of the Support Team can close tickets.",

                    flags:
                        MessageFlags.Ephemeral
                });
            }

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        "close_ticket_modal"
                    )
                    .setTitle(
                        "Close Ticket"
                    );

            const closeReasonInput =
                new TextInputBuilder()
                    .setCustomId(
                        "close_reason"
                    )
                    .setLabel(
                        "Why are you closing this ticket?"
                    )
                    .setPlaceholder(
                        "Provide the reason for closing this ticket."
                    )
                    .setStyle(
                        TextInputStyle.Paragraph
                    )
                    .setRequired(true)
                    .setMaxLength(1000);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(
                        closeReasonInput
                    )
            );

            await interaction.showModal(
                modal
            );

            return;
        }

        // ======================================
        // OPEN TICKET MODAL
        // ======================================

        if (
            interaction.isModalSubmit() &&
            interaction.customId === "open_ticket_modal"
        ) {

            await interaction.deferReply({
                flags:
                    MessageFlags.Ephemeral
            });

            const guild =
                interaction.guild;

            if (!guild) {

                return interaction.editReply({
                    content:
                        "This can only be used inside a server."
                });
            }

            const existingTicket =
                guild.channels.cache.find(
                    channel =>
                        channel.name ===
                        "ticket-" +
                        interaction.user.id
                );

            if (existingTicket) {

                return interaction.editReply({
                    content:
                        "You already have a ticket: " +
                        existingTicket
                });
            }

            const reason =
                interaction.fields.getTextInputValue(
                    "ticket_reason"
                );

            const robloxUsername =
                interaction.fields.getTextInputValue(
                    "roblox_username"
                );

            try {

                const ticketChannel =
                    await guild.channels.create({

                        name:
                            "ticket-" +
                            interaction.user.id,

                        type:
                            ChannelType.GuildText,

                        parent:
                            TICKET_CATEGORY_ID,

                        permissionOverwrites: [

                            {
                                id:
                                    guild.roles.everyone.id,

                                deny: [
                                    PermissionFlagsBits.ViewChannel
                                ]
                            },

                            {
                                id:
                                    interaction.user.id,

                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory
                                ]
                            },

                            {
                                id:
                                    SUPPORT_ROLE_ID,

                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory
                                ]
                            },

                            {
                                id:
                                    client.user.id,

                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory,
                                    PermissionFlagsBits.ManageChannels,
                                    PermissionFlagsBits.ManageMessages
                                ]
                            }
                        ]
                    });

                // ==================================
                // TICKET BUTTONS
                // ==================================

                const claimButton =
                    new ButtonBuilder()
                        .setCustomId(
                            "claim_ticket"
                        )
                        .setLabel(
                            "Claim Ticket"
                        )
                        .setEmoji(
                            "\uD83D\uDC64"
                        )
                        .setStyle(
                            ButtonStyle.Success
                        );

                const closeButton =
                    new ButtonBuilder()
                        .setCustomId(
                            "close_ticket"
                        )
                        .setLabel(
                            "Close Ticket"
                        )
                        .setEmoji(
                            "\uD83D\uDD12"
                        )
                        .setStyle(
                            ButtonStyle.Danger
                        );

                const row =
                    new ActionRowBuilder()
                        .addComponents(
                            claimButton,
                            closeButton
                        );

                // ==================================
                // TICKET EMBED
                // ==================================

                const ticketEmbed =
                    new EmbedBuilder()
                        .setTitle(
                            "Ticket Created"
                        )
                        .setDescription(
                            "Welcome " +
                            interaction.user +
                            "!\n\n" +
                            "A member of the Support Team will help you shortly."
                        )
                        .addFields(

                            {
                                name:
                                    "Opened by",

                                value:
                                    interaction.user.toString(),

                                inline:
                                    true
                            },

                            {
                                name:
                                    "Roblox Username",

                                value:
                                    robloxUsername,

                                inline:
                                    true
                            },

                            {
                                name:
                                    "Reason",

                                value:
                                    reason
                            }
                        )
                        .setColor(
                            0x5865F2
                        )
                        .setTimestamp();

                // ==================================
                // SEND TICKET MESSAGE
                // ==================================

                await ticketChannel.send({

                    content:
                        "<@&" +
                        SUPPORT_ROLE_ID +
                        "> " +
                        interaction.user,

                    embeds: [
                        ticketEmbed
                    ],

                    components: [
                        row
                    ],

                    allowedMentions: {

                        roles: [
                            SUPPORT_ROLE_ID
                        ],

                        users: [
                            interaction.user.id
                        ]
                    }
                });

                // Update activity
                await updateTicketActivity();

                await interaction.editReply({

                    content:
                        "Your ticket has been created: " +
                        ticketChannel
                });

                console.log(
                    "Ticket created by " +
                    interaction.user.tag
                );

            } catch (error) {

                console.error(
                    "TICKET CREATION ERROR:",
                    error
                );

                await interaction.editReply({

                    content:
                        "I could not create your ticket. " +
                        "Please check the bot permissions."
                });
            }

            return;
        }

        // ======================================
        // CLOSE TICKET MODAL
        // ======================================

        if (
            interaction.isModalSubmit() &&
            interaction.customId === "close_ticket_modal"
        ) {

            if (!isSupportStaff(interaction)) {

                return interaction.reply({

                    content:
                        "Only the Support Team can close tickets.",

                    flags:
                        MessageFlags.Ephemeral
                });
            }

            await interaction.deferReply({
                flags:
                    MessageFlags.Ephemeral
            });

            const channel =
                interaction.channel;

            if (!channel) {

                return interaction.editReply({

                    content:
                        "Ticket channel was not found."
                });
            }

            const closeReason =
                interaction.fields.getTextInputValue(
                    "close_reason"
                );

            try {

                let ticketUserId =
                    null;

                if (
                    channel.name.startsWith(
                        "ticket-"
                    )
                ) {

                    ticketUserId =
                        channel.name.substring(
                            "ticket-".length
                        );
                }

                // ==================================
                // LOCK TICKET
                // ==================================

                await channel.permissionOverwrites.edit(
                    interaction.guild.roles.everyone.id,
                    {
                        ViewChannel:
                            false
                    }
                );

                if (
                    ticketUserId &&
                    /^\d+$/.test(
                        ticketUserId
                    )
                ) {

                    await channel.permissionOverwrites.edit(
                        ticketUserId,
                        {
                            ViewChannel:
                                true,

                            SendMessages:
                                false,

                            ReadMessageHistory:
                                true
                        }
                    );
                }

                // ==================================
                // RENAME TICKET
                // ==================================

                if (
                    channel.name.startsWith(
                        "ticket-"
                    )
                ) {

                    await channel.setName(
                        "closed-" +
                        channel.name.substring(
                            "ticket-".length
                        )
                    );
                }

                // ==================================
                // CLOSED EMBED
                // ==================================

                const closedEmbed =
                    new EmbedBuilder()
                        .setTitle(
                            "Ticket Closed"
                        )
                        .setDescription(
                            "This ticket has been closed and locked."
                        )
                        .addFields(

                            {
                                name:
                                    "Closed by",

                                value:
                                    interaction.user.toString(),

                                inline:
                                    true
                            },

                            {
                                name:
                                    "Reason",

                                value:
                                    closeReason
                            }
                        )
                        .setColor(
                            0xED4245
                        )
                        .setTimestamp();

                await channel.send({

                    embeds: [
                        closedEmbed
                    ]
                });

                // Update activity
                await updateTicketActivity();

                await interaction.editReply({

                    content:
                        "Ticket closed successfully."
                });

                console.log(
                    "Ticket closed by " +
                    interaction.user.tag
                );

            } catch (error) {

                console.error(
                    "CLOSE ERROR:",
                    error
                );

                await interaction.editReply({

                    content:
                        "I could not close this ticket."
                });
            }

            return;
        }
    }
);

// ==========================================
// LOGIN
// ==========================================

client.login(TOKEN).catch((error) => {

    console.error(
        "LOGIN ERROR:",
        error
    );
});
