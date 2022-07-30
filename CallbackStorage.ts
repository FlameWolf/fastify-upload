"use strict";

import { FileInfo } from "busboy";
import { Readable } from "stream";
import { FileInternal } from "./FileInternal";
import { StorageOption } from "./form-data-parser";

type CallbackType = (source: Readable) => any;

export class CallbackStorage implements StorageOption {
	callback: CallbackType;
	constructor(callback: CallbackType) {
		this.callback = callback;
	}
	process(name: string, stream: Readable, info: FileInfo) {
		this.callback(stream);
		return new FileInternal(name, info);
	}
}