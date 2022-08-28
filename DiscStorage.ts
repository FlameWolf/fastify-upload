"use strict";

import { StorageOption, TargetType, File } from "./index";
import { Readable, finished } from "stream";
import { FileInfo } from "busboy";
import { FileInternal } from "./FileInternal";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";

export class DiscStorage implements StorageOption {
	target: TargetType;
	constructor(target: TargetType) {
		this.target = target;
	}
	process(name: string, stream: Readable, info: FileInfo) {
		const target = this.target;
		const file = new FileInternal(name, info);
		const saveLocation = typeof target === "function" ? target(file) : target;
		const filePath = path.join(saveLocation?.directory || os.tmpdir(), saveLocation?.fileName || file.originalName);
		const fileStream = fs.createWriteStream(filePath);
		stream.pipe(fileStream);
		return new Promise<File>(resolve => {
			finished(stream, err => {
				file.error = err as Error;
				file.path = filePath;
				resolve(file);
			});
		});
	}
}