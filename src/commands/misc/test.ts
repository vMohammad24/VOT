import { createCanvas } from "@napi-rs/canvas";
import type ICommand from "../../handler/interfaces/ICommand";
import path from 'path';
import { ApplicationCommandOptionType } from "discord.js";
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration' // import plugin
import { parseTime } from "../../util/util";
dayjs.extend(duration) // use plugin

export default {
    description: "test command for devs",
    perms: "dev",
    options: [{
        name: "test",
        description: "test",
        type: ApplicationCommandOptionType.String,
        required: true
    }],
    disabled: true,
    execute: async ({ interaction, handler, args }) => {
        const duration = args[0]
        const a = parseTime(duration)
        console.log(a)
        return new Date(Date.now() + a * 1000).toLocaleString()

    }
} as ICommand;