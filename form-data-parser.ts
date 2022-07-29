"use strict";

import { FastifyPluginAsync, FastifyPluginOptions } from "fastify";
import { Limits, FileInfo } from "busboy";
import { PassThrough, Readable, Transform } from "stream";
import busboy = require("busboy");
import os = require("os");
import fs = require("fs");

import * as path from "path";

interface Dictionary extends Object {
	[key: string | symbol]: any;
}
export interface FileSaveTarget {
	directory?: string;
	fileName?: string;
}
export interface FormDataParserPluginOptions extends FastifyPluginOptions {
	limits?: Limits;
	storage?: "disc" | "stream" | "buffer" | "callback";
	location?: FileSaveTarget | ((source: File) => FileSaveTarget);
	callback?: (sourceStream: Readable) => any;
}
export interface File {
	field: string | undefined;
	name: string;
	encoding: string;
	mimeType: string;
	path: string | undefined;
	stream: Readable | undefined;
	data: Buffer | undefined;
}
export type FormDataParserPlugin = FastifyPluginAsync<FormDataParserPluginOptions> & Dictionary;
class FileInternal implements File {
	field: string | undefined;
	name!: string;
	encoding!: string;
	mimeType!: string;
	path: string | undefined;
	stream: Readable | undefined;
	data: Buffer | undefined;
	constructor(name?: string, info?: FileInfo) {
		this.field = name;
		if (info) {
			this.name = info.filename;
			this.encoding = info.encoding;
			this.mimeType = info.mimeType;
		}
	}
}
declare module "fastify" {
	interface FastifyRequest {
		__files__?: Array<File>;
	}
}

const formDataParser: FormDataParserPlugin = async (instance, options) => {
	instance.addContentTypeParser("multipart/form-data", (request, message, done) => {
		const files: Array<File> = [];
		const body: Dictionary = {};
		const props = (request.context as Dictionary).schema?.body?.properties;
		const bus = busboy({ headers: message.headers, limits: options?.limits });
		bus.on("file", (name: string, stream: Readable, info: FileInfo) => {
			const file = new FileInternal(name, info);
			switch (options.storage) {
				case "disc":
					const locationOption = options.location;
					const location = typeof locationOption === "function" ? locationOption(file) : locationOption;
					const filePath = path.join(location?.directory || os.tmpdir(), location?.fileName || file.name);
					const fileStream = fs.createWriteStream(filePath);
					stream.pipe(fileStream);
					stream.on("close", () => {
						file.path = filePath;
					});
					break;
				case "stream":
					const delegateStream = new PassThrough();
					stream.on("data", chunk => delegateStream.push(chunk));
					stream.on("close", () => {
						file.stream = delegateStream;
					});
					break;
				case "buffer":
					const data: Array<Uint8Array> = [];
					stream.on("data", chunk => data.push(chunk));
					stream.on("close", () => {
						file.data = Buffer.concat(data);
					});
					break;
				case "callback":
					const transformStream = new Transform({
						transform: function (chunk, encoding, callback) {
							this.push(chunk);
							callback();
						}
					});
					options.callback?.(stream.pipe(transformStream));
					break;
			}
			files.push(file);
			body[name] = JSON.stringify(info);
		});
		bus.on("field", (name, value) => {
			if (props && props[name]?.type !== "string") {
				try {
					body[name] = JSON.parse(value);
					return;
				} catch (err) {}
			}
			body[name] = value;
		});
		bus.on("close", () => {
			request.__files__ = files;
			done(null, body);
		});
		bus.on("error", (error: Error) => {
			done(error);
		});
		message.pipe(bus);
	});
	instance.addHook("preHandler", async (request, reply) => {
		const body = request.body as Dictionary;
		const files = request.__files__ as Array<File>;
		if (files?.length) {
			for (const fileObject of files) {
				const field = fileObject.field as string;
				delete fileObject.field;
				body[field] = fileObject;
			}
		}
		delete request.__files__;
	});
};
formDataParser[Symbol.for("skip-override")] = true;

export default formDataParser;