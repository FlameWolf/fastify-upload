"use strict";

import { StorageOption, File } from "./index";
import { Readable, PassThrough, finished } from "stream";
import { FileInfo } from "busboy";
import { FileInternal } from "./FileInternal";

export class StreamStorage implements StorageOption {
	process(name: string, stream: Readable, info: FileInfo) {
		const file = new FileInternal(name, info);
		const delegateStream = new PassThrough();
		stream.on("data", chunk => delegateStream.push(chunk));
		return new Promise<File>(resolve =>
			finished(stream, err => {
				file.error = err as Error;
				file.stream = delegateStream;
				resolve(file);
			})
		);
	}
}