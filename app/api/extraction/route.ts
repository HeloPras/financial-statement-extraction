import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime"
import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PandLTextExtraction,PandLJSONConverter } from "@/utils/api/prompts";

const client = new BedrockRuntimeClient({
  region: "us-east-1",
  requestHandler: {
    requestTimeout: 300_000, // Increase to 5 minutes for heavy multimodal tasks
  },
})




async function TextExtractionFromPDF(file: File) {
  // Load your PDF files as Buffers

  console.log("Extracting text from PDF...")

  const command = new ConverseCommand({
    modelId: "us.amazon.nova-lite-v1:0",
    messages: [
      {
        role: "user",
        content: [
          {
            document: {
              name: "ContractV1",
              format: "pdf",
              source: { bytes: new Uint8Array(await file.arrayBuffer()) },
            },
          },
          {
            text: PandLTextExtraction,
          },
        ],
      },
    ],
    inferenceConfig: {
      maxTokens: 10000,
      temperature: 0,
      topP: 1,
    },
  })

  const response = await client.send(command)
  const rawtext = response.output?.message?.content?.[0]?.text || ""

  const parsed = JSON.parse(rawtext)
  console.log("this is the parded text after extraction only ",parsed)


  console.log("Extraction Complete ✅✅✅ .....")

  // return NextResponse.json({rawtext: rawtext ,parsed: parsed })
  return NextResponse.json({ data: parsed })
}



const TableJSONConversion = async (textData: string) => {
  console.log("Converting text into JSON using Nova Lite....")

  const command = new ConverseCommand({
    modelId: "us.amazon.nova-lite-v1:0",
    messages: [
      {
        role: "user",
        content: [
          {
            text: `INPUT DATA:\n${textData}`,
          },
          {
            text: PandLJSONConverter,
          },
        ],
      },
    ],
    inferenceConfig: {
      maxTokens: 10000,
      temperature: 0,
      topP: 1,
    },
  })

  try {
    const response = await client.send(command)
    const rawtext = response.output?.message?.content?.[0]?.text || "{}"

    console.log("raw text in tablejsonconverter",rawtext)
    
    const jsonResponse = JSON.parse(rawtext)
    
    console.log("this is the json response", jsonResponse)
    console.log("Conversion complete ✅✅✅ .....")
    return jsonResponse
  } catch (error) {
    console.error("Error during Nova conversion:", error)
    throw error
  }
}



export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get("file") as File

  const rawResponse = await TextExtractionFromPDF(file)
  const rawData = await   rawResponse.json()
  console.log("This is raw data before json converter",rawData);

  const jsonData = JSON.stringify(rawData)

  
  console.log("this is the json data before json converter",jsonData)

  const tableData = await TableJSONConversion(jsonData)


  return NextResponse.json({ parsed: tableData })
}
