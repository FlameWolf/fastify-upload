"use strict";

import fastify, { FastifyInstance, FastifyRequest, FastifyReply, FastifyPluginOptions } from "fastify";
import fastifySwagger from "@fastify/swagger";
import formDataParser from "./form-data-parser";
import { BufferStorage } from "./BufferStorage";
import { StreamStorage } from "./StreamStorage";
import { DiscStorage } from "./DiscStorage";
import { CallbackStorage } from "./CallbackStorage";

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
			},
			poll: {
				type: "object",
				properties: {
					first: { type: "string" },
					second: { type: "string" }
				},
				required: ["first", "second"]
			}
		}
	}
};
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
server.get("/", async (request, reply) => {
	reply.redirect("/swagger");
});
server.register(formDataParser);
server.register(
	async (instance: FastifyInstance, options: FastifyPluginOptions) => {
		/* Test file upload */
		instance.post(
			"/create",
			{
				schema: postCreateSchema
			},
			(request: FastifyRequest, reply: FastifyReply) => {
				console.log(request.body);
				reply.status(200).send();
			}
		);
		/* Test optional params */
		instance.post(
			"/test/:param1/:param2?",
			{
				schema: {
					params: {
						type: "object",
						properties: {
							param1: {
								type: "string"
							},
							param2: {
								anyOf: [
									{
										type: "string"
									},
									{
										type: "null"
									}
								]
							}
						}
					}
				}
			},
			async (request: FastifyRequest, reply: FastifyReply) => {
				reply.status(200).send({
					requestParams: request.params
				});
			}
		);
	},
	{ prefix: "/posts" }
);
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