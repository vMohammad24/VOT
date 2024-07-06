import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/utils";
import Link from "next/link";

export default function InviteButton() {
    return (
        <div className="absolute m-auto top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-fit">
          <Link href={apiUrl + "discord/invite"} className="justify-center">
            <Button>Invite VOT</Button>
          </Link>
        </div>
    );
}