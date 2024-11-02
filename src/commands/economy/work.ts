import ICommand from "../../handler/interfaces/ICommand";

export default {
    description: "Work for money",
    cooldown: 60_000 * 5,
    execute: async ({ user, handler: { prisma } }) => {
        const money = Math.floor(Math.random() * 500) + 1;
        const eco = await prisma.economy.findFirst({
            where: {
                userId: user.id
            }
        })
        if (!eco) return {
            content: 'You do not have an economy account, please run the `balance` command to create one',
            ephemeral: true
        };
        eco.balance += money;
        await prisma.economy.update({
            where: {
                userId: user.id
            },
            data: {
                balance: eco.balance
            }
        })
        return {
            content: `You worked for ${money} coins!`
        }
    }
} as ICommand