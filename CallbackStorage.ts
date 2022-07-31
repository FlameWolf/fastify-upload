"use strict";

import { Readable } from "stream";
import { FileInfo } from "busboy";
import { File, StorageOption } from "./index";

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