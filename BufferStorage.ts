"use strict";

import { StorageOption, File } from "./index";
import { Readable, finished } from "stream";
import { FileInfo } from "busboy";
import { FileInternal } from "./FileInternal";

export class BufferStorage implements StorageOption {
	process(name: string, stream: Readable, info: FileInfo) {
		const file = new FileInternal(name, info);
		const data: Array<Uint8Array> = [];
		return new Promise<File>(resolve => {
			finished(stream, err => {
				file.error = err as Error;
				file.data = Buffer.concat(data);
				resolve(file);
			});
			stream.on("data", chunk => data.push(chunk));
		});
	}
}