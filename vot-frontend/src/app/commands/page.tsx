import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { apiUrl } from "../../lib/utils";
export default async function Commands() {
  let commands: { name: string; description: string; category: string }[] = [];
  await fetch(apiUrl + "commands", {
    cache: "reload",
  })
    .then(async (res) => await res.json())
    .then((data) => {
      commands = data;
    });
  return (
    <main className="bg-slate-900 min-h-screen text-white overflow-hidden pt-16">
      <div className="absolute left-1/2 -translate-x-1/2 min-w-full flex">
        <div className="grid grid-flow-row-dense grid-cols-5 justify-stretch gap-5 p-10">
          {commands
            .filter((e) => e != null)
            .map((command) => {
              return (
                <Card key={command.name}>
                  <CardHeader>
                    <CardTitle>{command.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{command.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </div>
    </main>
  );
}
