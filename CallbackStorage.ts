"use strict";

import { Readable } from "stream";
import { File, StorageOption } from "./lib/types";
import { FileInfo } from "busboy";

type CallbackType = (name: string, stream: Readable, info: FileInfo) => File;

export class CallbackStorage implements StorageOption {
	callback: CallbackType;
	constructor(callback: CallbackType) {
		this.callback = callback;
	}
	process(name: string, stream: Readable, info: FileInfo) {
		return this.callback(name, stream, info);
	}
}