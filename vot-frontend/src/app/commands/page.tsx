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
  console.log(commands);
  return (
    <main className="bg-slate-900 min-h-screen text-white overflow-hidden pt-16">
      <div className="absolute left-1/2 -translate-x-1/2 min-w-full flex">
        <div
          className="flexbox content-center justify-items-center gap-x-2 gap-y-2"
          id="commands"
        >
          {commands.filter((e) => e != null).map((command) => {
            return (
              <Card key={command.name} className="w-80">
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
