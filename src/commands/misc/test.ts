import { createCanvas } from "@napi-rs/canvas";
import type ICommand from "../../handler/interfaces/ICommand";
import path from 'path';
export default {
    description: "test command for devs",
    perms: "dev",
    disabled: true,
    execute: async ({ interaction, handler }) => {
        const canvas = createCanvas(300, 320)
        const ctx = canvas.getContext('2d')



        return { files: [canvas.toBuffer("image/png")], content: path.join(import.meta.dir, '..', '..', '..', 'assets') }
    },

} as ICommand