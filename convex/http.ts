import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
    path: "/api/chat",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return new Response("Unauthorized", { status: 401 });
        }

        const {messages}: {messages: UIMessage[]} = await req.json();

        const lastMessages = messages.slice(-10);

        const result = streamText({
            model: openai("gpt-3.5-turbo"),
            system: `You are a helpful assistant that can answers the user's questions.`,
            messages: await convertToModelMessages(lastMessages),
            onError: (error) => {
                console.error("Error streaming text", error);
                
            },
        });

        return result.toUIMessageStreamResponse({
            headers: new Headers({
                "Access-Control-Allow-Origin": "*",
                "Vary": "Origin",
            }),
        });
    }),
});

http.route({
    path: "/api/chat",
    method: "OPTIONS",
    handler: httpAction(async (_, request) => {
      const headers = request.headers;
      if (
        headers.get("Origin") !== null &&
        headers.get("Access-Control-Request-Method") !== null &&
        headers.get("Access-Control-Request-Headers") !== null
      ) {
        return new Response(null, {
          headers: new Headers({
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Allow-Headers": "Content-Type, Digest, Authorization",
            "Access-Control-Max-Age": "86400",
          }),
        });
      } else {
        return new Response();
      }
    }),
  });

export default http;
