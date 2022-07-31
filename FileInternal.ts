"use strict";

import { File } from "./index";
import { Readable } from "stream";
import { FileInfo } from "busboy";

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