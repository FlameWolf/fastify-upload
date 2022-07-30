"use strict";

import { FileInfo } from "busboy";
import { PassThrough, Readable } from "stream";
import { FileInternal } from "./FileInternal";
import { StorageOption } from "./form-data-parser";

export class StreamStorage implements StorageOption {
	process(name: string, stream: Readable, info: FileInfo) {
		const file = new FileInternal(name, info);
		const delegateStream = new PassThrough();
		stream.on("data", chunk => delegateStream.push(chunk));
		stream.on("close", () => {
			file.stream = delegateStream;
		});
		return file;
	}
}