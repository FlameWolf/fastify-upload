"use strict";

import { FileInfo } from "busboy";
import { Readable } from "stream";
import { FileInternal } from "./FileInternal";
import { StorageOption } from "./form-data-parser";

export class BufferStorage implements StorageOption {
	process(name: string, stream: Readable, info: FileInfo) {
		const file = new FileInternal(name, info);
		const data: Array<Uint8Array> = [];
		stream.on("data", chunk => data.push(chunk));
		stream.on("close", () => {
			file.data = Buffer.concat(data);
		});
		return file;
	}
}