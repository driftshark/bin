export type BinItem =
	| (() => unknown)
	| RBXScriptConnection
	| { destroy(): void }
	| { Destroy(): void }
	| { cancel(): void };

const HttpService = game.GetService("HttpService");

const cleanItem = (item: BinItem) => {
	if (typeIs(item, "function")) {
		item();
	} else if (typeIs(item, "RBXScriptConnection")) {
		item.Disconnect();
	} else if ("Destroy" in item) {
		item.Destroy();
	} else if ("destroy" in item) {
		item.destroy();
	} else if ("cancel" in item) {
		item.cancel();
	}
};

export class Bin {
	private items = new Map<string, BinItem>();
	public destroyed = false;

	public add<TItem extends BinItem>(
		item: TItem,
		index: string = HttpService.GenerateGUID(false)
	): TItem {
		if (this.destroyed) {
			cleanItem(item);
			return item;
		}

		if (this.items.has(index)) {
			cleanItem(this.items.get(index)!);
		}

		this.items.set(index, item);

		return item;
	}

	public addPromise<TPromise extends Promise<unknown>>(
		item: TPromise
	): TPromise {
		if (this.destroyed) {
			cleanItem(item);
			return item;
		}

		if (item.getStatus() === Promise.Status.Started) {
			const id = HttpService.GenerateGUID(false);
			const newPromise = this.add(Promise.resolve(item), id);

			newPromise.finally(() => {
				this.remove(id);
			});
			return newPromise as TPromise;
		} else {
			return item;
		}
	}

	public remove(index: string) {
		if (this.items.has(index)) {
			cleanItem(this.items.get(index)!);
		}

		this.items.delete(index);
	}

	public get(index: string) {
		return this.items.get(index);
	}

	public destroy() {
		this.destroyed = true;
		for (const [index, item] of this.items) {
			if (typeIs(item, "RBXScriptConnection")) {
				this.items.delete(index);
				cleanItem(item);
			}
		}

		let [index, item] = next(this.items);
		while (item !== undefined) {
			this.items.delete(index);
			cleanItem(item);
			[index, item] = next(this.items);
		}
	}
}
