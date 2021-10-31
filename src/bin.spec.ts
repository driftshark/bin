/// <reference types="@rbxts/testez/globals" />

import { Bin } from "index";
import { deepEquals } from "@driftshark/table";

export = () => {
	describe("add", () => {
		it("should add item", () => {
			const bin = new Bin();

			const unnamedItem = () => {};
			bin.add(unnamedItem);

			const namedItem = () => 1;
			bin.add(namedItem, "name");

			let otherName = "";
			for (const [i] of bin["items"]) {
				if (i !== "name") otherName = i;
			}

			expect(
				deepEquals(bin["items"], {
					[otherName]: unnamedItem,
					name: namedItem,
				})
			).to.equal(true);

			bin.destroy();
		});

		it("should immediately clean item if bin is already destroyed", () => {
			const bin = new Bin();
			bin.destroy();

			let count = 0;
			const item = () => {
				count += 1;
			};
			bin.add(item);

			expect(count).to.equal(1);
			expect(deepEquals(bin["items"], {})).to.equal(true);
		});

		it("should clean old item if index exists", () => {
			const bin = new Bin();

			let count = 0;
			const oldItem = () => {
				count += 1;
			};
			bin.add(oldItem, "item");
			expect(count).to.equal(0);
			expect(bin["items"].get("item")).to.equal(oldItem);
			const newItem = () => {};
			bin.add(newItem, "item");
			expect(count).to.equal(1);
			expect(bin["items"].get("item")).to.equal(newItem);
			expect(bin["items"].get("item")).to.never.equal(oldItem);

			bin.destroy();
		});

		it("should add promise", () => {
			const bin = new Bin();

			const stalePromise = new Promise((resolve) => {
				resolve(true);
			});
			task.wait();
			expect(stalePromise.getStatus() === Promise.Status.Resolved).to.equal(
				true
			);
			bin.addPromise(stalePromise);
			expect(deepEquals(bin["items"], {})).to.equal(true);

			const livePromise = new Promise((resolve) => {
				resolve(true);
			});
			expect(stalePromise.getStatus() === Promise.Status.Started).to.equal(
				true
			);
			const livePromiseResult = bin.addPromise(livePromise);
			const [liveIndex] = next(bin["items"]);
			expect(bin.get(liveIndex)).to.equal(livePromiseResult);
			task.wait();
			expect(deepEquals(bin["items"], {})).to.equal(true);

			bin.destroy();
		});

		it("should immediately cancel promise if bin is already destroyed", () => {
			const bin = new Bin();
			bin.destroy();

			let count = 0;
			const item = new Promise((resolve, reject, onCancel) => {
				onCancel(() => {
					count += 1;
				});
			});
			bin.addPromise(item);

			expect(count).to.equal(1);
			expect(deepEquals(bin["items"], {})).to.equal(true);

			bin.destroy();
		});
	});

	describe("remove", () => {
		it("should clean index", () => {
			const bin = new Bin();

			let count = 0;
			const item = () => {
				count += 1;
			};
			bin.add(item, "namedItem");

			const item2 = () => {
				count += 2;
			};
			bin.add(item2, "namedItem2");

			expect(
				deepEquals(bin["items"], {
					namedItem: item,
					namedItem2: item2,
				})
			).to.equal(true);

			bin.remove("namedItem");

			expect(count).to.equal(1);
			expect(
				deepEquals(bin["items"], {
					namedItem2: item2,
				})
			).to.equal(true);
		});

		it("should clean all supported items", () => {
			const bin = new Bin();

			let count = 0;

			const func = () => {
				count += 1;
			};

			const cn = {
				Disconnect() {
					count += 1;
				},
			} as unknown as RBXScriptConnection;

			const lowercaseDestroy = {
				destroy() {
					count += 1;
				},
			};

			const uppercaseDestroy = {
				Destroy() {
					count += 1;
				},
			};

			const cancel = {
				cancel() {
					count += 1;
				},
			};

			bin.add(func);
			bin.add(cn);
			bin.add(lowercaseDestroy);
			bin.add(uppercaseDestroy);
			bin.add(cancel);

			bin.destroy();

			expect(count).to.equal(5);
		});

		it("should only clean promise if not completed", () => {
			let count = 0;
			const stalePromise = new Promise((resolve, reject, onCancel) => {
				onCancel(() => {
					count += 1;
				});
				resolve(true);
			});
			task.wait();
			expect(stalePromise.getStatus() === Promise.Status.Resolved).to.equal(
				true
			);

			const livePromise = new Promise((resolve, reject, onCancel) => {
				let cancelled = false;
				onCancel(() => {
					count += 1;
					cancelled = true;
				});

				while (!cancelled) {
					task.wait();
				}

				resolve(1);
			});

			const bin = new Bin();
			bin.addPromise(stalePromise);
			bin.addPromise(livePromise);
			bin.destroy();

			expect(count).to.equal(1);
		});
	});

	describe("get", () => {
		it("should return item at index", () => {
			const bin = new Bin();
			const f = () => {};
			bin.add(f, "func");
			expect(bin.get("func")).to.equal(f);
			bin.destroy();
		});
	});

	describe("destroy", () => {
		it("should set destroyed to true", () => {
			const bin = new Bin();
			expect(bin.destroyed).to.equal(false);
			bin.destroy();
			expect(bin.destroyed).to.equal(true);
		});

		it("should clean all items", () => {
			const bin = new Bin();

			let count = 0;

			const func = () => {
				count += 1;
			};

			const cn = {
				Disconnect() {
					count += 1;
				},
			} as unknown as RBXScriptConnection;

			const lowercaseDestroy = {
				destroy() {
					count += 1;
				},
			};

			const uppercaseDestroy = {
				Destroy() {
					count += 1;
				},
			};

			const cancel = {
				cancel() {
					count += 1;
				},
			};

			const livePromise = new Promise((resolve, reject, onCancel) => {
				let cancelled = false;
				onCancel(() => {
					count += 1;
					cancelled = true;
				});

				while (!cancelled) {
					task.wait();
				}

				resolve(1);
			});

			bin.add(func);
			bin.add(cn);
			bin.add(lowercaseDestroy);
			bin.add(uppercaseDestroy);
			bin.add(cancel);
			bin.addPromise(livePromise);

			bin.destroy();

			expect(count).to.equal(6);
			expect(deepEquals(bin["items"], {})).to.equal(true);
		});
	});
};
