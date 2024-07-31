import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle, Message,
    type Interaction,
    type InteractionReplyOptions,
    type MessageReplyOptions,
    type RepliableInteraction
} from "discord.js";

interface ConfirmOptions {
    redBtnText: string;
    greenBtnText: string;
    context: Message | Interaction;
    onConfirm: (interaction: ButtonInteraction) => void;
    onDecline: (Interaction: ButtonInteraction) => void;
}

export default class Confirm {
    private row: ActionRowBuilder<ButtonBuilder>;
    private context: Message | Interaction;
    private onConfirm: (interaction: ButtonInteraction) => void;
    private onDecline: (interaction: ButtonInteraction) => void;
    constructor({
        onConfirm,
        onDecline,
        context,
        greenBtnText,
        redBtnText,
    }: ConfirmOptions) {
        this.row = new ActionRowBuilder<ButtonBuilder>().addComponents([
            new ButtonBuilder()
                .setStyle(ButtonStyle.Success)
                .setLabel(greenBtnText)
                .setCustomId("yes"),
            new ButtonBuilder()
                .setStyle(ButtonStyle.Danger)
                .setLabel(redBtnText)
                .setCustomId("no"),
        ]);
        this.context = context;
        this.onConfirm = onConfirm;
        this.onDecline = onDecline;
    }
    public async reply(payload: MessageReplyOptions | InteractionReplyOptions) {
        let components = payload.components
            ? [this.row, ...payload.components]
            : [this.row];
        let msg =
            this.context instanceof Message
                ? await this.context.reply({
                    ...(payload as MessageReplyOptions),
                    components: components,
                })
                : ((await (this.context as RepliableInteraction).reply({
                    ...(payload as InteractionReplyOptions),
                    components: components,
                    fetchReply: true,
                })) as Message);
        this.createCollector(msg);
    }
    private createCollector(msg: Message) {
        let usr =
            this.context instanceof Message ? this.context.author : this.context.user;
        let collector = msg.createMessageComponentCollector({
            filter: (int) => int.user.id == usr.id,
            time: 15_000,
            max: 1,
        });
        collector.on("collect", (int) => {
            if (!int.isButton()) return;
            switch (int.customId) {
                case "yes": {
                    this.onConfirm(int);
                    break;
                }
                case "no": {
                    this.onDecline(int);
                    break;
                }
            }
        });
        collector.on("end", async (_) => {
            msg.components.forEach((row, index) => {
                if (index != 0) return;
                row.components.forEach((comp) => {
                    if (comp instanceof ButtonBuilder) comp.setDisabled(true);
                });
            });
            if (await msg.channel.messages.cache.get(msg.id))
                msg.edit({ components: msg.components });
        });
    }
}