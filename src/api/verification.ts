import axios from 'axios';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import Elysia from 'elysia';
import commandHandler from '..';
import { hashIP } from '../util/hash';
import { isVPN } from '../util/vpn';

const hCaptchaSiteKey = process.env.HCAPTCHA_SITE_KEY;
const hCaptchaSecret = process.env.HCAPTCHA_SECRET;

const verifyCaptcha = async (token: string, ip: string) => {
    const res = await axios(`https://hcaptcha.com/siteverify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: {
            response: token,
            secret: hCaptchaSecret,
            remoteip: ip,
            sitekey: hCaptchaSiteKey
        }
    });
    const data = res.data;
    return data.success;
}

export default (server: Elysia<"guilds">) => {
    server.ws('/:id/verify', {
        async open(ws) {
            const hCaptcha = ws.data.query.token;
            const ip = ws.data.headers['X-Forwarded-For'] || ws.remoteAddress;
            if (!ip) {
                ws.send(JSON.stringify({ error: 'how did you even get here my guy' }));
                ws.close();
                return;
            }
            if (!hCaptcha) {
                ws.send(JSON.stringify({ error: 'Please complete the captcha.' }));
                ws.close();
                return;
            }
            const captcha = await verifyCaptcha(hCaptcha, ip);
            if (!captcha) {
                ws.send(JSON.stringify({ error: 'Captcha verification failed.' }));
                ws.close();
                return;
            }
            const token = ws.data.cookie['token'].value || ws.data.query.uToken;
            const id = ws.data.params.id;
            if (!token) {
                ws.send(JSON.stringify({ error: 'Unauthorized' }));
                ws.close();
                return;
            }
            const user = await commandHandler.prisma.user.findUnique({
                where: { token },
                include: {
                    guildMembers: true
                }
            })
            if (!user) {
                ws.send(JSON.stringify({ error: 'Unauthorized (2)' }));
                ws.close();
                return;
            }
            const guild = await commandHandler.prisma.guild.findFirst({
                where: { id: id, admins: { some: { id: user.id } } },
                include: {
                    VerificationSettings: true
                },
            });
            if (!guild) {
                ws.send(JSON.stringify({ error: 'Unauthorized (3)' }));
                ws.close();
                return;
            }
            if (!guild.VerificationSettings) {
                ws.send(JSON.stringify({ error: 'This server does not have verification settings.' }));
                ws.close();
                return;
            };
            const { allowVpns, blockIfBanned } = guild.VerificationSettings;
            const isVpn = allowVpns ? false : await isVPN(ip);
            if (isVpn) {
                ws.send(JSON.stringify({ error: 'VPN Detected' }));
                ws.close();
                return;
            }
            const aGuild = await commandHandler.client.guilds.cache.get(id);
            if (!aGuild) {
                ws.send(JSON.stringify({ error: 'I am not in this server.' }));
                ws.close();
                return;
            }
            const member = await aGuild.members.fetch(user.id);
            if (!member) {
                ws.send(JSON.stringify({ error: 'You are not in this server.' }));
                ws.close();
                return;
            }
            const channel = guild.loggingChannel ? await aGuild.channels.fetch(guild.loggingChannel) : null;
            const bans = user.guildMembers.filter(member => member.banned);
            if (!guild.VerificationSettings.roleId) {
                ws.send(JSON.stringify({ error: 'This server does not have a verification role.' }));
                ws.close();
                return;
            }
            if (member.roles.cache.has(guild.VerificationSettings.roleId)) {
                ws.send(JSON.stringify({ error: 'You are already verified.' }));
                ws.close();
                return;
            }
            // check if the bot is able to give the member the role
            if (aGuild.members.me && !aGuild.members.me.roles.highest.comparePositionTo(guild.VerificationSettings.roleId)) {
                ws.send(JSON.stringify({ error: 'I do not have the permission to give you the verification role. Please contact the server owner.' }));
                ws.close();
                return;
            }
            const verifyMember = async () => {
                await member.roles.add(guild.VerificationSettings!.roleId!);
                try {
                    ws.send(JSON.stringify({ success: true }));
                    ws.close();
                } catch (e) {

                }
                if (channel && channel.isTextBased()) {
                    try {
                        await channel.send({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle('Member Verified')
                                    .setDescription(`${member.user.tag} has been verified.`)
                                    .setColor('Green')
                            ],
                            content: `<@${member.id}>`,
                            allowedMentions: {},
                        });
                    } catch (error) {

                    }
                }
                return {
                    success: true
                }
            }
            if (blockIfBanned && bans.length >= blockIfBanned) {
                ws.send(JSON.stringify({ error: `This server does not allow members with over ${blockIfBanned} bans.` }));
                ws.close();
                if (channel && channel.isTextBased()) {
                    try {
                        const msg = await channel.send({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle('Verification')
                                    .setAuthor({ name: user.name || 'Unknown', iconURL: user.avatar || undefined })
                                    .setDescription(`${user.name || 'Unknown'} has tried to verify but has over ${bans.length} bans in servers with VOT.`)
                                    .setColor('Red')
                            ],
                            components: [
                                new ActionRowBuilder<ButtonBuilder>()
                                    .addComponents(
                                        new ButtonBuilder()
                                            .setCustomId('verify')
                                            .setLabel('Verify Anyways')
                                            .setStyle(ButtonStyle.Success)
                                    )
                            ]
                        })
                        const col = msg.createMessageComponentCollector();
                        col.on('collect', async i => {
                            i.deferReply();
                            const ver = await verifyMember();
                            if (!ver.success) {
                                i.editReply('An error occurred while verifying the user.');
                            };
                            i.reply(member.user.tag + ' has been verified by ' + i.user.tag);
                        })
                    } catch (error) {

                    }
                }
                try {
                    ws.close();
                } catch (e) {

                }
                return;
            }


            const hashedIp = hashIP(ip);
            if (user.previousIps.includes(hashedIp) || user.hashedIp == hashedIp) return;
            await commandHandler.prisma.user.update({
                where: { id: user.id },
                data: {
                    hashedIp
                }
            });
        },
    })
};
