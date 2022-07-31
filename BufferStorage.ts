"use strict";

import { StorageOption } from "./index";
import { Readable } from "stream";
import { FileInfo } from "busboy";
import { FileInternal } from "./FileInternal";

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