import { join } from "node:path";
import type { Glob } from "bun";
import type CommandHandler from ".";

export default class ListenerHandler {
	public listeners: IListener[] = [];
	private handler: CommandHandler;
	private glob: Glob;
	constructor(handler: CommandHandler, listenersDir: string, glob: Glob) {
		this.handler = handler;
		this.glob = glob;
		this.initListeners(listenersDir);
	}

	public async initListeners(listenersDir: string) {
		for await (const file of this.glob.scan({
			absolute: false,
			cwd: listenersDir,
		})) {
			const listener = await import(join(listenersDir, file));
			this.listeners.push(listener.default as IListener);
			listener.default.execute(this.handler);
			if (this.handler.verbose)
				this.handler.logger.info(
					`Initialized listener ${listener.default.name}`,
				);
		}
	}
}

export interface IListener {
	name: string | undefined;
	description: string;
	execute: (handler: CommandHandler) => Promise<void>;
}
