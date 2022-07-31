"use strict";

import { StorageOption } from "./lib/types";
import { Readable, PassThrough } from "stream";
import { FileInfo } from "busboy";
import { FileInternal } from "./FileInternal";

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