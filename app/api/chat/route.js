import { GoogleGenerativeAI } from "@google/generative-ai";
import { Pinecone } from "@pinecone-database/pinecone";
import { NextResponse } from "next/server";

const systemPrompt = `
You are an AI assistant designed to help students find university professors and lecturers that suit their needs. Your knowledge base includes detailed, reviews, rating, about, achievements, email, office hours, soft skills, teaching style, title, how often they quiz their students and subject areas for professors.

When a user seeks professor recommendations, your task is to provide the relevant options based on their query. Utilize a Retrieval Augmented Generation (RAG) approach: first, retrieve the most relevant professor information from your database, then generate a concise response highlighting the top professors.

Your responses should be clear, informative, and tailored to the user's specific needs. If necessary, ask clarifying questions to better understand the user's preferences and requirements.

**Example queries you might receive:**
- "Can you recommend a professor for an introductory computer science course?"
- "I need a highly rated Data Structure professor known for engaging lectures. Any suggestions?"
- "I am struggling in complex problems and need a professor who offers extra support. Who would you recommend?"
- "What are some top-rated professors in Computer Science, considering their engaging lectures and strong teaching style?"

Student can also ask question regarding professor name, office Hours, email, behavior and teaching styles.
If someone ask irrelevant questions send these examples and ask them to ask like this.

For each query, respond in this format:
A suitable recommendation about the response of what have been asked:
\n
- **[Professor name]**
  \t- [Brief 1-2 sentence description of why this professor is a good fit]

Similar for other professors
Feel free to ask for more details or additional criteria to refine the recommendations further.`;

export async function POST(req) {
  const data = await req.json();

  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  const index = pc.index("rag").namespace("ns1");
  const genAI = new GoogleGenerativeAI(process.env.API_KEY);

  const text = data[data.length - 1].content;
  const model = genAI.getGenerativeModel({
    model: "text-embedding-004",
  });

  const embedding = await model.embedContent(text);

  const results = await index.query({
    topK: 5,
    includeMetadata: true,
    vector: embedding.embedding.values,
  });

  let resultString = "";
  results.matches.forEach((match) => {
    resultString += `
    Returned Results:
    Professor: ${match.id}
    Review: ${match.metadata.review}
    Subject: ${match.metadata.subjects}
    Ratings: ${match.metadata.ratings}
    About: ${match.metadata.about}
    Achievements: ${match.metadata.achievements}
    Email: ${match.metadata.email}
    Experience: ${match.metadata.experience}
    Office Hours: ${match.metadata.officeHours}
    Soft Skills: ${match.metadata.softSkills}
    Teaching Style: ${match.metadata.teachingStyle}
    Title: ${match.metadata.title}
    \n\n`;
  });

  const lastMessage = data[data.length - 1];
  const lastMessageContent = lastMessage.content + resultString;
  const lastDataWithoutLastMessage = data.slice(0, data.length - 1);

  const dota = await genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    systemInstruction: systemPrompt,
  });

  const request = [
    systemPrompt,
    ...lastDataWithoutLastMessage.map((msg) => msg.content),
    lastMessageContent,
  ];

  const completionStream = await dota.generateContentStream(request, {
    stream: true,
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of completionStream.stream) {
          const content = chunk.candidates[0].content.parts[0].text;
          if (content) {
            const text = encoder.encode(content);
            controller.enqueue(text);
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });
  return new NextResponse(stream);
}
