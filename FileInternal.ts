"use strict";

import { FileInfo } from "busboy";
import { Readable } from "stream";
import { File } from "./form-data-parser";

export class FileInternal implements File {
	field: string | undefined;
	originalName: string;
	encoding: string;
	mimeType: string;
	path: string | undefined;
	stream: Readable | undefined;
	data: Buffer | undefined;
	constructor(name: string, info: FileInfo) {
		this.field = name;
		this.originalName = info.filename;
		this.encoding = info.encoding;
		this.mimeType = info.mimeType;
	}
}