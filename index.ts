"use strict";

import { Readable, finished } from "stream";
import { FileInfo, Limits } from "busboy";
import { FastifyPluginOptions, FastifyPluginAsync } from "fastify";
import { StreamStorage } from "./StreamStorage";
import * as busboy from "busboy";
import { FieldParser } from "./FieldParser";

export interface Dictionary extends Object {
	[key: string | symbol]: any;
}
export interface File {
	field: string | undefined;
	originalName: string;
	encoding: string;
	mimeType: string;
	path: string | undefined;
	stream: Readable | undefined;
	data: Buffer | undefined;
	error: Error | undefined;
}
export type FileHandler = (name: string, stream: Readable, info: FileInfo) => File | Promise<File>;
export interface StorageOption {
	process: FileHandler;
}
export interface FileSaveTarget {
	directory?: string;
	fileName?: string;
}
export type TargetType = FileSaveTarget | ((source: File) => FileSaveTarget);
export interface FormDataParserPluginOptions extends FastifyPluginOptions {
	limits?: Limits;
	storage?: StorageOption;
}
export type FormDataParserPlugin = FastifyPluginAsync<FormDataParserPluginOptions> & Dictionary;
declare module "fastify" {
	interface FastifyRequest {
		__files__?: Array<File>;
	}
}

const formDataParser: FormDataParserPlugin = async (instance, options) => {
	const { limits, storage = new StreamStorage() } = options;
	instance.addContentTypeParser("multipart/form-data", (request, message, done) => {
		const results: Array<File | Promise<File>> = [];
		const body = new Map();
		const parser = new FieldParser((request.routeOptions.schema?.body as any)?.properties);
		const bus = busboy({ headers: message.headers, limits });
		bus.on("file", (name, stream, info) => {
			results.push(storage.process(name, stream, info));
			const fileProp = body.get(name);
			if (!fileProp) {
				body.set(name, JSON.stringify(info));
				return;
			}
			if (Array.isArray(fileProp)) {
				fileProp.push(JSON.stringify(info));
				return;
			}
			body.set(name, [fileProp, JSON.stringify(info)]);
		});
		bus.on("field", (name, value) => {
			body.set(name, parser.parseField(name, value));
		});
		finished(bus, (err = null) => {
			Promise.all(results).then(files => {
				request.__files__ = files;
				done(err, Object.fromEntries(body));
			});
		});
		message.pipe(bus);
	});
	instance.addHook("preHandler", async request => {
		const body = request.body as Dictionary;
		const files = request.__files__ as Array<File>;
		if (files?.length) {
			const fileFields = new Map();
			for (const file of files) {
				const field = file.field;
				delete file.field;
				const fileProp = fileFields.get(field);
				if (!fileProp) {
					fileFields.set(field, file);
					continue;
				}
				if (Array.isArray(fileProp)) {
					fileProp.push(file);
					continue;
				}
				fileFields.set(field, [fileProp, file]);
			}
			Object.assign(request.body as Dictionary, Object.fromEntries(fileFields));
		}
		delete request.__files__;
	});
};
formDataParser[Symbol.for("skip-override")] = true;

export default formDataParser;