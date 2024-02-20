import { Button } from "@/components/ui/button";
import { Spotify } from "@prisma/client";

export default function SpotifyRelink({
  spotify,
}: {
  spotify: Spotify | null;
}) {
  return <div>{spotify ? <Button>Relink</Button> : <Button>Link</Button>}</div>;
}
