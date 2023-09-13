import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { openai } from "../lib/openai";
import { z } from 'zod'

export async function generateAiCompletionRoute(app: FastifyInstance) {
    app.post('/ai/complete', async (req, reply) => {
        const bodySchema = z.object({
            template: z.string(),
            videoId: z.string().uuid(),
            temperature: z.number().min(0).max(1).default(0.5)
        })

        const { temperature, template, videoId } = bodySchema.parse(req.body)

        const video = await prisma.video.findUniqueOrThrow({
            where: {
                id: videoId
            }
        })

        if (!video.transcription) {
            return reply.status(400).send({ error: 'Video transcription was not generated yet.' })
        }

        const promptMessage = template.replace('{transcription}', video.transcription);

        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo-16k',
            temperature,
            messages: [
                {
                    role: 'user',
                    content: promptMessage
                }
            ]
        })

        return response;

    })
}