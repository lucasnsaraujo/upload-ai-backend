import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { fastifyMultipart } from '@fastify/multipart'
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
import fs from 'node:fs'

const pump = promisify(pipeline)

export async function uploadVideoRoute(app: FastifyInstance) {
    app.register(fastifyMultipart, {
        limits: {
            fileSize: 1_048_576 * 25, // 25 Megabytes
        }
    })
    app.post('/videos', async (request, reply) => {
        const data = await request.file();

        if (!data) {
            return reply.status(400).send({ error: 'Missing file' })
        }

        const extension = path.extname(data.filename);

        if (extension !== '.mp3') {
            return reply.status(400).send({ error: 'Invalid input type, please upload an MP3 file' })
        }

        const fileBaseName = path.basename(data.filename, extension)

        const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`

        const uploadDirectory = path.resolve(__dirname, '../../tmp', fileUploadName)

        await pump(data.file, fs.createWriteStream(uploadDirectory))

        const video = await prisma.video.create({
            data: {
                name: data.filename,
                path: uploadDirectory
            }
        })

        return { video }
    })
}