"use strict";

import { FastifyPluginAsync, FastifyPluginOptions, FastifySchema } from "fastify";
import busboy = require("busboy");
import { Busboy, Limits, FileInfo } from "busboy";

interface Dictionary extends Object {
	[key: string | symbol]: any;
}
class RouteSchemaMap extends Object {
	[key: string]: Dictionary | undefined;
}
interface FormDataParserPluginOptions extends Limits, FastifyPluginOptions {}
type FormDataParserPlugin = FastifyPluginAsync<FormDataParserPluginOptions> & Dictionary;
class File {
	fieldName!: string;
	fileName!: string;
	encoding!: string;
	mimeType!: string;
	data!: Buffer;

	constructor(fileInfo?: FileInfo) {
		if (fileInfo) {
			this.fileName = fileInfo.filename;
			this.encoding = fileInfo.encoding;
			this.mimeType = fileInfo.mimeType;
		}
	}
}
declare module "fastify" {
	interface FastifyRequest {
		__files__?: Array<Dictionary>;
	}
}

const formDataParser: FormDataParserPlugin = async (instance, options) => {
	const instanceSchemas = new RouteSchemaMap();
	instance.addContentTypeParser("multipart/form-data", (request, message, done) => {
		const fileList: Array<Dictionary> = [];
		const formData: Dictionary = {};
		const schemaProps = (instanceSchemas[request.url] as Dictionary)?.properties;
		const bus = busboy({ headers: message.headers, limits: options });
		bus.on("file", (fieldName: string, file: Busboy, fileInfo: FileInfo) => {
			const chunks: Array<Uint8Array> = [];
			const fileObject = new File(fileInfo);
			fileObject.fieldName = fieldName;
			file.on("data", data => chunks.push(data));
			file.on("close", () => {
				fileObject.data = Buffer.concat(chunks);
				fileList.push(fileObject);
				formData[fieldName] = JSON.stringify(fileInfo);
			});
		});
		bus.on("field", (fieldName, fieldValue) => {
			if (schemaProps) {
				const schemaType = schemaProps[fieldName]?.type;
				if (schemaType !== "string") {
					try {
						formData[fieldName] = JSON.parse(fieldValue);
						return;
					} catch (err) {}
				}
			}
			formData[fieldName] = fieldValue;
		});
		bus.on("close", () => {
			request.__files__ = fileList;
			done(null, formData);
		});
		bus.on("error", (error: Error) => {
			done(error);
		});
		message.pipe(bus);
	});
	instance.addHook("onRoute", async routeOptions => {
		instanceSchemas[routeOptions.url] = routeOptions.schema?.body as Dictionary;
	});
	instance.addHook("preHandler", async (request, reply) => {
		const requestBody = request.body as Dictionary;
		const requestFiles = request.__files__ as Array<Dictionary>;
		if (requestFiles?.length) {
			for (const fileObject of requestFiles) {
				const fieldName = fileObject.fieldName;
				delete fileObject.fieldName;
				delete requestBody.fieldName;
				requestBody[fieldName] = fileObject;
			}
		}
		delete request.__files__;
	});
};
formDataParser[Symbol.for("skip-override")] = true;

export default formDataParser;