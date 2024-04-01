import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { Link } from "lucide-react";

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
  const isFinished = new Date(giveaway.end) < new Date();
  return (
    <main className="bg-slate-900 min-h-screen text-white overflow-hidden">
      <div className="absolute m-auto top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-fit">
        <Card>
          <CardHeader>
            <h1 className="font-bold text-lg">{giveaway.title}</h1>
            <h3 className="pl-1 font-extralight">{giveaway.description}</h3>
            <p className="pt-5">
              {isFinished
                ? `This giveaway ended on `
                : "This giveaway will end on "}
              {new Date(giveaway.end).toLocaleString()}
            </p>
            <p></p>
          </CardHeader>
          <CardContent>
            {isFinished && (
              <ul>
                <h3>Winners:</h3>
                <Button>
                  {giveaway.winners.map((winner) => (
                    <li key={winner.id}>{winner.name}</li>
                  ))}
                </Button>
              </ul>
            )}
            <ul>
              <h3>Entrants:</h3>
              <Button>
                {giveaway.entrants.map((entrant) => (
                  <li key={entrant.id}>{entrant.name}</li>
                ))}
              </Button>
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
