import type { PrismaClient } from "@prisma/client/extension";
import type { IListener } from "../handler/listenres";
import { ChannelType, EmbedBuilder, Guild, PermissionOverwrites, type GuildTextBasedChannel, type TextBasedChannel, PermissionFlagsBits, PermissionOverwriteManager, ActionRowBuilder, ButtonBuilder, ButtonStyle, CategoryChannel, ButtonInteraction } from "discord.js";
import Confirm from "../util/confirm";
import { uploadFile } from "../util/nest";
import { getLogChannel } from "../util/util";




export default {
    description: "Listens for ticket creation and deletion",
    name: "tickets",
    execute: ({ client, prisma }) => {
        client.on('interactionCreate', async (interaction) => {
            if (!interaction.isButton()) return;
            const logsChannel = await getLogChannel(prisma, interaction.guild!);
            switch (interaction.customId) {
                case 'create_ticket':
                    const ticketSettings = await prisma.ticketSettings.findUnique({
                        where: {
                            guildId: interaction.guildId!
                        }
                    })
                    const alreadyExists = await prisma.ticket.findFirst({
                        where: {
                            guildId: interaction.guildId!,
                            userId: interaction.user.id,
                            open: true
                        }
                    })
                    if (alreadyExists) {
                        const embed = new EmbedBuilder()
                            .setTitle('Ticket Already Exists')
                            .setDescription(`You already have an open ticket <#${alreadyExists.channelId}>`)
                            .setColor('Red')
                        interaction.reply({ embeds: [embed], ephemeral: true })
                        return;
                    }
                    const channel = await interaction.guild?.channels.create({
                        name: `ticket-${interaction.user.username}`,
                        type: ChannelType.GuildText,
                        permissionOverwrites: [
                            {
                                id: interaction.guildId!,
                                deny: [PermissionFlagsBits.ViewChannel]
                            },
                            {
                                id: interaction.user.id,
                                allow: [PermissionFlagsBits.ViewChannel]
                            },
                            // so vscode doesnt get mad 
                            ...(ticketSettings?.categoryId && ticketSettings?.roleId ? [
                                {
                                    id: ticketSettings.roleId!,
                                    allow: [PermissionFlagsBits.ViewChannel]
                                }
                            ] : [])
                        ],
                        parent: ticketSettings?.categoryId
                            ? (interaction.guild.channels.cache.get(ticketSettings.categoryId) as CategoryChannel)
                            : undefined,
                        reason: `Ticket created by ${interaction.user.displayName}`
                    });
                    if (!channel) return;
                    const ticket = await prisma.ticket.create({
                        data: {
                            guildId: interaction.guildId!,
                            channelId: channel.id,
                            userId: interaction.user.id,
                            open: true
                        }
                    })
                    const embed = new EmbedBuilder()
                        .setTitle('Ticket Created')
                        .setDescription(`Your ticket has been created in <#${channel?.id}>`)
                        .setColor('Green')
                    interaction.reply({ embeds: [embed], ephemeral: true })
                    const embed2 = new EmbedBuilder()
                        .setTitle('Ticket Created')
                        .setDescription(`Please wait for a staff member to assist you`)
                        .setColor('Green')
                    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setCustomId('close_ticket')
                            .setLabel('Close Ticket')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('🔒')
                    )
                    channel?.send({ embeds: [embed2], components: [row] })
                    const logEmbed = new EmbedBuilder()
                        .setTitle('Ticket Created')
                        .setDescription(`${channel.name} has been created`)
                        .setAuthor({ name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() })
                        .setColor('Green')
                        .setTimestamp()
                    logsChannel?.send({ embeds: [logEmbed] })
                    break;
                case 'close_ticket':
                    const ticketData = await prisma.ticket.findFirst({
                        where: {
                            channelId: interaction.channelId
                        }
                    })
                    if (!ticketData) {
                        const embed = new EmbedBuilder()
                            .setTitle('Error')
                            .setDescription('This is not a ticket channel')
                            .setColor('Red')
                        interaction.reply({ embeds: [embed], ephemeral: true })
                        return;
                    }
                    const chan = await interaction.guild?.channels.fetch(interaction.channelId) as GuildTextBasedChannel;
                    if (!chan) return;
                    const onConfirm = async (inter: ButtonInteraction) => {
                        // const messages = await chan.messages.fetch();
                        // let content = "";
                        // for (const message of messages.values()) {
                        //     if (!message) continue;
                        //     if (message.author.bot) continue;
                        //     content += `(${message.createdTimestamp}) (${message.author.username}) ${message.content}\n`
                        // }
                        // const uploadedData = await uploadFile([content])
                        // console.log(uploadedData)
                        await prisma.ticket.update({
                            where: {
                                id: ticketData.id
                            },
                            data: {
                                open: false,
                                // transcriptId: uploadedData.cdnFileName
                            }
                        })
                        const logEmbed2 = new EmbedBuilder()
                            .setTitle('Ticket Closed')
                            .setDescription(`Ticket ${chan.name} has been closed`)
                            .setAuthor({ name: inter.user.displayName, iconURL: inter.user.displayAvatarURL() })
                            // .addFields({
                            //     name: 'Transcript',
                            //     value: `[Download](https://cdn.nest.rip/uploads/${uploadedData.cdnFileName})`
                            // })
                            .setColor('Red')
                            .setTimestamp()
                        logsChannel?.send({ embeds: [logEmbed2] })
                        await chan.delete()
                    }
                    const onDecline = (inter: ButtonInteraction) => {
                        inter.update({ content: "Ticket close declined", components: [] })
                    }
                    const confirm = new Confirm({ context: interaction, onConfirm, onDecline, greenBtnText: "Close Ticket", redBtnText: "Cancel" })
                    confirm.reply({ content: "Are you sure you want to close this ticket?", ephemeral: true })
                    break;
            }
        })
    }
} as IListener