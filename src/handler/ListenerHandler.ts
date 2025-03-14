import type { Glob } from 'bun';
import type CommandHandler from '.';

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
		const files = [...this.glob.scanSync({
			absolute: true,
			cwd: listenersDir,
		})];
		const s = await Promise.all(files.map(file => {
			return import(file).then((listener) => {
				if (this.handler.verbose) this.handler.logger.info(`Initialized listener ${listener.default.name}`);
				this.listeners.push(listener.default as IListener);
				listener.default.execute(this.handler);
			});
		}))
		if (this.handler.verbose) this.handler.logger.info(`Initialized ${s.length}/${this.listeners.length} listeners`);
	}
}

export interface IListener {
	name: string | undefined;
	description: string;
	execute: (handler: CommandHandler) => Promise<void>;
}
