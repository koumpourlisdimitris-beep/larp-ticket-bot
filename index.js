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

const TOKEN = process.env.DISCORD_TOKEN;

const TICKET_PANEL_CHANNEL_ID = "1541034126017171476";
const TICKET_CATEGORY_ID = "1541033963651465266";
const SUPPORT_ROLE_ID = "1517358979179876384";

const client = new Client({
intents: [
GatewayIntentBits.Guilds
]
});

function isSupportStaff(interaction) {
return (
interaction.member &&
interaction.member.roles &&
interaction.member.roles.cache.has(SUPPORT_ROLE_ID)
);
}

async function updateTicketActivity() {
try {
if (!client.user) {
return;
}

    const guild = client.guilds.cache.first();

    if (!guild) {
        return;
    }

    const ticketCount = guild.channels.cache.filter(
        channel =>
            channel.type === ChannelType.GuildText &&
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
        "Activity: Handling " +
        ticketCount +
        " tickets"
    );

} catch (error) {
    console.error(
        "ACTIVITY ERROR:",
        error
    );
}

}

function createTicketButtons() {
const claimButton = new ButtonBuilder()
.setCustomId("claim_ticket")
.setLabel("Claim Ticket")
.setEmoji("👤")
.setStyle(ButtonStyle.Success);

const closeButton = new ButtonBuilder()
    .setCustomId("close_ticket")
    .setLabel("Close Ticket")
    .setEmoji("🔒")
    .setStyle(ButtonStyle.Danger);

return new ActionRowBuilder().addComponents(
    claimButton,
    closeButton
);

}

client.once(Events.ClientReady, async () => {
console.log(
"Logged in as " +
client.user.tag
);

await updateTicketActivity();

setInterval(
    updateTicketActivity,
    30000
);

try {
    const panelChannel =
        await client.channels.fetch(
            TICKET_PANEL_CHANNEL_ID
        );

    if (!panelChannel) {
        console.error(
            "Ticket panel channel not found."
        );
        return;
    }

    const button = new ButtonBuilder()
        .setCustomId("open_ticket")
        .setLabel("Open Ticket")
        .setEmoji("🎫")
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder()
        .addComponents(button);

    await panelChannel.send({
        embeds: [
            new EmbedBuilder()
                .setTitle("LARP Support")
                .setDescription(
                    "Need help?\n\n" +
                    "Click the button below to create a support ticket."
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
        "PANEL ERROR:",
        error
    );
}

});

client.on(
Events.InteractionCreate,
async interaction => {

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
                "Why are you opening this ticket?"
            )
            .setPlaceholder(
                "Explain what you need help with."
            )
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000);

        const usernameInput = new TextInputBuilder()
            .setCustomId("roblox_username")
            .setLabel("Roblox Username")
            .setPlaceholder(
                "Enter your Roblox username."
            )
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100);

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(reasonInput),

            new ActionRowBuilder()
                .addComponents(usernameInput)
        );

        await interaction.showModal(modal);

        return;
    }

    if (
        interaction.isModalSubmit() &&
        interaction.customId === "open_ticket_modal"
    ) {
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const guild = interaction.guild;

        if (!guild) {
            await interaction.editReply({
                content:
                    "This can only be used inside a server."
            });

            return;
        }

        const safeUsername =
            interaction.user.username
                .toLowerCase()
                .replace(/[^a-z0-9-_]/g, "-")
                .replace(/-+/g, "-")
                .substring(0, 80);

        const ticketName =
            "ticket-" +
            safeUsername;

        const existingTicket =
            guild.channels.cache.find(
                channel =>
                    channel.name === ticketName
            );

        if (existingTicket) {
            await interaction.editReply({
                content:
                    "You already have a ticket: " +
                    existingTicket
            });

            return;
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
                    name: ticketName,

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

            const embed =
                new EmbedBuilder()
                    .setTitle("Ticket Created")
                    .setDescription(
                        "Welcome " +
                        interaction.user +
                        "!\n\n" +
                        "A member of the Support Team will help you shortly."
                    )
                    .addFields(
                        {
                            name: "Roblox Username",
                            value: robloxUsername,
                            inline: true
                        },
                        {
                            name: "Reason",
                            value: reason
                        }
                    )
                    .setColor(0x5865F2)
                    .setTimestamp();

            await ticketChannel.send({
                content:
                    "<@&" +
                    SUPPORT_ROLE_ID +
                    "> " +
                    interaction.user,

                embeds: [
                    embed
                ],

                components: [
                    createTicketButtons()
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
                "TICKET ERROR:",
                error
            );

            await interaction.editReply({
                content:
                    "I could not create the ticket. Please check the bot permissions."
            });
        }

        return;
    }

    if (
        interaction.isButton() &&
        interaction.customId === "claim_ticket"
    ) {
        if (!isSupportStaff(interaction)) {
            await interaction.reply({
                content:
                    "Only the Support Team can claim tickets.",

                flags:
                    MessageFlags.Ephemeral
            });

            return;
        }

        const channel =
            interaction.channel;

        if (!channel) {
            return;
        }

        if (
            channel.topic &&
            channel.topic.startsWith("CLAIMED_BY:")
        ) {
            const claimedUserId =
                channel.topic.substring(
                    "CLAIMED_BY:".length
                );

            await interaction.reply({
                content:
                    "This ticket has already been claimed by <@" +
                    claimedUserId +
                    ">.",

                flags:
                    MessageFlags.Ephemeral
            });

            return;
        }

        try {
            await channel.setTopic(
                "CLAIMED_BY:" +
                interaction.user.id
            );

            const claimButton =
                new ButtonBuilder()
                    .setCustomId("claim_ticket")
                    .setLabel(
                        "Claimed by " +
                        interaction.user.username
                    )
                    .setEmoji("👤")
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(true);

            const closeButton =
                new ButtonBuilder()
                    .setCustomId("close_ticket")
                    .setLabel("Close Ticket")
                    .setEmoji("🔒")
                    .setStyle(ButtonStyle.Danger);

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
                    "This ticket has been claimed by " +
                    interaction.user +
                    "."
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

    if (
        interaction.isButton() &&
        interaction.customId === "close_ticket"
    ) {
        if (!isSupportStaff(interaction)) {
            await interaction.reply({
                content:
                    "Only the Support Team can close tickets.",

                flags:
                    MessageFlags.Ephemeral
            });

            return;
        }

        const modal = new ModalBuilder()
            .setCustomId("close_ticket_modal")
            .setTitle("Close Ticket");

        const reasonInput =
            new TextInputBuilder()
                .setCustomId("close_reason")
                .setLabel(
                    "Why are you closing this ticket?"
                )
                .setPlaceholder(
                    "Enter the reason for closing this ticket."
                )
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(true)
                .setMaxLength(1000);

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(
                    reasonInput
                )
        );

        await interaction.showModal(modal);

        return;
    }

    if (
        interaction.isModalSubmit() &&
        interaction.customId === "close_ticket_modal"
    ) {
        if (!isSupportStaff(interaction)) {
            await interaction.reply({
                content:
                    "Only the Support Team can close tickets.",

                flags:
                    MessageFlags.Ephemeral
            });

            return;
        }

        await interaction.deferReply({
            flags:
                MessageFlags.Ephemeral
        });

        const channel =
            interaction.channel;

        if (!channel) {
            await interaction.editReply({
                content:
                    "Ticket channel not found."
            });

            return;
        }

        const closeReason =
            interaction.fields.getTextInputValue(
                "close_reason"
            );

        try {
            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Ticket Closed")
                        .setDescription(
                            "This ticket has been closed."
                        )
                        .addFields(
                            {
                                name: "Closed By",
                                value:
                                    interaction.user.toString(),
                                inline: true
                            },
                            {
                                name: "Reason",
                                value: closeReason
                            }
                        )
                        .setColor(0xED4245)
                        .setTimestamp()
                ]
            });

            await channel.permissionOverwrites.edit(
                interaction.guild.roles.everyone.id,
                {
                    ViewChannel: false
                }
            );

            await channel.permissionOverwrites.edit(
                SUPPORT_ROLE_ID,
                {
                    ViewChannel: true,
                    SendMessages: false,
                    ReadMessageHistory: true
                }
            );

            const ticketUserId =
                channel.topic &&
                channel.topic.startsWith("CLAIMED_BY:")
                    ? null
                    : null;

            const channelName =
                channel.name.startsWith("ticket-")
                    ? channel.name.substring(7)
                    : channel.name;

            if (
                channel.name.startsWith("ticket-")
            ) {
                await channel.setName(
                    "closed-" +
                    channelName
                );
            }

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

if (!TOKEN) {
console.error(
"DISCORD_TOKEN is missing."
);

process.exit(1);

}

client.login(TOKEN).catch(error => {
console.error(
"LOGIN ERROR:",
error
);
});

