import ICommand from '../../handler/interfaces/ICommand';

export default {
	description: "Reset's the AI training data",
	name: 'resetdata',
	type: 'dmOnly',
	execute: async ({ user, handler }) => {
		const yes = await handler.prisma.trainingData.deleteMany({
			where: {
				userId: user.id,
			},
		});
		return {
			content: `Deleted ${yes.count} training data`,
			ephemeral: true,
		};
	},
} as ICommand;
