"use strict";

import { FileSaveTarget, File, StorageOption } from "./index";
import { Readable } from "stream";
import { FileInfo } from "busboy";
import { FileInternal } from "./FileInternal";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";

type TargetType = FileSaveTarget | ((source: File) => FileSaveTarget);

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
		stream.on("close", () => {
			file.path = filePath;
		});
		return file;
	}
}