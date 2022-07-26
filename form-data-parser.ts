"use strict";

import { FastifyPluginAsync, FastifyPluginOptions } from "fastify";
import busboy = require("busboy");
import { Limits, FileInfo } from "busboy";
import { Readable } from "stream";

interface Dictionary extends Object {
	[key: string | symbol]: any;
}
export interface FormDataParserPluginOptions extends Limits, FastifyPluginOptions {}
export type FormDataParserPlugin = FastifyPluginAsync<FormDataParserPluginOptions> & Dictionary;
export class File {
	field?: string;
	name!: string;
	encoding!: string;
	mimeType!: string;
	data!: Buffer;

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
		const bus = busboy({ headers: message.headers, limits: options });
		bus.on("file", (name: string, stream: Readable, info: FileInfo) => {
			const data: Array<Uint8Array> = [];
			const file = new File(name, info);
			stream.on("data", chunk => data.push(chunk));
			stream.on("close", () => {
				file.data = Buffer.concat(data);
				files.push(file);
				body[name] = JSON.stringify(info);
			});
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