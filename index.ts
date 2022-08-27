"use strict";

import { Readable } from "stream";
import { FileInfo, Limits } from "busboy";
import { FastifyPluginOptions, FastifyPluginAsync } from "fastify";
import { StreamStorage } from "./StreamStorage";
import * as busboy from "busboy";

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
}
export type FileHandler = (name: string, stream: Readable, info: FileInfo) => File | Promise<File>;
export interface StorageOption {
	process: FileHandler;
}
export interface FileSaveTarget {
	directory?: string;
	fileName?: string;
}
export interface FormDataParserPluginOptions extends FastifyPluginOptions {
	limits?: Limits;
	storage?: StorageOption;
}
export type FormDataParserPlugin = FastifyPluginAsync<FormDataParserPluginOptions> & Dictionary;
type FieldParser = (name: string, value: string) => string;
declare module "fastify" {
	interface FastifyRequest {
		__files__?: Array<File>;
	}
}

const tryParse = (value: string) => {
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
};
const formDataParser: FormDataParserPlugin = async (instance, options) => {
	const { limits, storage = new StreamStorage() } = options;
	instance.addContentTypeParser("multipart/form-data", (request, message, done) => {
		const results: Array<File | Promise<File>> = [];
		const body: Dictionary = {};
		const props = (request.context as Dictionary).schema?.body?.properties;
		const parseField: FieldParser = props ? (name, value) => (props[name]?.type === "string" ? value : tryParse(value)) : (name, value) => value;
		const bus = busboy({ headers: message.headers, limits });
		bus.on("file", (name: string, stream: Readable, info: busboy.FileInfo) => {
			results.push(storage.process(name, stream, info));
			body[name] = JSON.stringify(info);
		});
		bus.on("field", (name, value) => {
			body[name] = parseField(name, value);
		});
		bus.on("close", () => {
			Promise.all(results).then(files => {
				request.__files__ = files;
				done(null, body);
			});
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