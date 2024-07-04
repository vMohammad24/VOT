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
    cache: "default",
  })
    .then(async (res) => await res.json())
    .then((data) => {
      commands = data;
    });
  commands.sort((a, b) => a.name.localeCompare(b.name));
  return (
    <main className="min-h-screen pt-20">
      <div className="min-w-full flex">
        <div className="grid grid-flow-row-dense justify-stretch gap-5 p-10 md:grid-cols-5">
          {commands
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
