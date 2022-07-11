"use strict";

import fastify, { FastifyInstance, FastifyRequest, FastifyReply, FastifyPluginOptions, HookHandlerDoneFunction } from "fastify";
import multer, { memoryStorage } from "fastify-multer";
import fastifyMultipart from "@fastify/multipart";
import { File } from "fastify-multer/lib/interfaces";
import fastifySwagger from "@fastify/swagger";

const isProdEnv = process.env.NODE_ENV === "production";
if (!isProdEnv) {
	require("dotenv").config();
}
const postCreateSchema = {
	consumes: ["multipart/form-data"],
	body: {
		type: "object",
		properties: {
			content: {
				type: "string"
			},
			media: {
				type: "string",
				format: "binary"
			}
		}
	}
};
const uploadMediaFile = multer({
	limits: {
		fileSize: 1024 * 1024 * 5
	},
	storage: memoryStorage()
}).single("media");
const server: FastifyInstance = fastify({ logger: true });
if (!isProdEnv) {
	server.register(fastifySwagger, {
		routePrefix: "/swagger",
		exposeRoute: true,
		openapi: {
			info: {
				title: "Fastify Upload",
				version: "1.0.0"
			}
		}
	});
}
/* CODE FOR FASTIFY-MULTER */
server.register(multer.contentParser).after(() => {
	server.register(
		(instance: FastifyInstance, options: FastifyPluginOptions, next: HookHandlerDoneFunction) => {
			instance.post(
				"/create",
				{
					schema: postCreateSchema,
					preHandler: uploadMediaFile
				},
				(request: FastifyRequest, reply: FastifyReply) => {
					const content = (request.body as any).content as string;
					const file = (request as any).file as File;
					if (file) {
						delete file.buffer;
					}
					reply.send({
						content,
						file: JSON.stringify(file) || "No file selected"
					});
				}
			);
			next();
		},
		{ prefix: "/posts" }
	);
});
/* CODE FOR FASTIFY-MULTIPART WHICH ALSO GIVES THE SAME ERROR  */
/* COMMENT OUT THE FASTIFY-MULTER BLOCK BEFORE UNCOMMENTING THE BELOW LINES */
// server.register(fastifyMultipart).after(() => {
// 	server.register(
// 		(instance: FastifyInstance, options: FastifyPluginOptions, next: HookHandlerDoneFunction) => {
// 			instance.post(
// 				"/create",
// 				{
// 					schema: postCreateSchema
// 				},
// 				async (request: FastifyRequest, reply: FastifyReply) => {
// 					const content = (request.body as any).content as string;
// 					const file = await request.file();
// 					reply.send({
// 						content,
// 						file: JSON.stringify(file) || "No file selected"
// 					});
// 				}
// 			);
// 			next();
// 		},
// 		{ prefix: "/posts" }
// 	);
// });
server.setErrorHandler((err: Error, request: FastifyRequest, reply: FastifyReply) => {
	request.log.error(err.toString());
	console.error(err.stack);
	reply.status(reply.statusCode || 500).send(err);
});
server.listen(
	{
		port: +(process.env.PORT || "3072"),
		host: process.env.HOST || "127.0.0.1"
	},
	(err, address) => {
		if (err) {
			console.log(err.message);
			process.exit(1);
		}
		console.log(`Listening on ${address}`);
	}
);