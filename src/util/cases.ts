import { type CaseType, PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function createCase(
	guildId: string,
	type: CaseType,
	targetId: string,
	moderatorId: string,
	reason?: string,
) {
	const latestCase = await prisma.case.findFirst({
		where: { guildId },
		orderBy: { caseId: "desc" },
	});

	const caseId = (latestCase?.caseId ?? 0) + 1;

	const newCase = await prisma.case.create({
		data: {
			caseId,
			type,
			targetId,
			moderatorId,
			reason,
			guild: { connect: { id: guildId } },
		},
	});

	return newCase;
}

export async function getCase(guildId: string, caseId: number) {
	return await prisma.case.findUnique({
		where: {
			guildId_caseId: {
				guildId,
				caseId,
			},
		},
	});
}
