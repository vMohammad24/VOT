import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import prisma from "@/lib/prisma";
import moment from 'moment';
export default async function Giveaway({ params }: { params: { id: string } }) {
  const giveaway = await prisma.giveaway.findUnique({
    where: {
      id: params.id,
    },
    include: {
      winners: {
        select: {
          name: true,
          id: true,
        },
      },
      entrants: {
        select: {
          name: true,
          id: true,
        },
      },
    },
  });
  if (!giveaway) {
    return <h1>Giveaway not found</h1>;
  }
  const isFinished = giveaway.ended;
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <Card className="w-full max-w-5xl">
        <CardHeader>
          <h3 className="text-2xl font-bold">{giveaway.title}</h3>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <CardDescription>
              {giveaway.description}
            </CardDescription>
            <CardDescription>
              {isFinished ? 'Ended' : 'Ends on'} {moment(giveaway.end).format('MMMM Do YYYY, h:mm a (Z)')}
            </CardDescription> 
          </div>
        </CardContent>
        <CardContent>
          {isFinished && <div className="flex flex-col gap-2 w-full">
            <h3 className="text-2xl font-bold">Winners</h3>
            {giveaway.winners.map(e => e.name).join(', ')}
          </div>}
          <div className="flex flex-col gap-2 w-full">
            <h3 className="text-2xl font-bold">Entrants</h3>
            {giveaway.entrants.filter(e => e).map(e => e.name).join(', ')}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
