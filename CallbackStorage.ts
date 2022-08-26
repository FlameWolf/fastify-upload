"use strict";

import { Readable } from "stream";
import { FileInfo } from "busboy";
import { FileHandler, StorageOption } from "./index";

export class CallbackStorage implements StorageOption {
	callback: FileHandler;
	constructor(callback: FileHandler) {
		this.callback = callback;
	}
	process(name: string, stream: Readable, info: FileInfo) {
		return this.callback(name, stream, info);
	}
}