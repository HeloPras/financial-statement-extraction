import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime"
import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PandLTextExtraction,PandLJSONConverter, BalanceSheetTextExtraction, BalanceSheetJSONConverter,tempBStable } from "@/utils/api/prompts";

const client = new BedrockRuntimeClient({
  region: "us-east-1",
  requestHandler: {
    requestTimeout: 300_000, // Increase to 5 minutes for heavy multimodal tasks
  },
})

function cleanLLMJson(raw: string): string {
  if (!raw) return "{}"

  if(raw.includes("`")){

  return raw
    .replace(/^\s*```json\s*/i, "")
    .replace(/^\s*```\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim()

}

return raw
}

// const columnAdjustment = (tableJSON:string)=>{


// }


async function TextExtractionFromPDF(file: File, prompt:string) {

  console.log("Extracting text from PDF...")

  const command = new ConverseCommand({
    modelId: "us.amazon.nova-2-lite-v1:0",
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
            text: prompt,
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

  // const parsed = JSON.parse(rawtext)
  console.log("this is the raw text after extraction only ",rawtext)

  const cleanedJson = cleanLLMJson(rawtext)

  console.log("Extraction Complete ✅✅✅ .....")

  // return NextResponse.json({rawtext: rawtext ,parsed: parsed })
  return cleanedJson
}


const TableJSONConversion = async (textData: string,prompt:string) => {
  console.log("Converting text into JSON using Nova Lite....")

  const command = new ConverseCommand({
    modelId: "us.amazon.nova-2-lite-v1:0",
    messages: [
      {
        role: "user",
        content: [
          {
            text: `INPUT DATA:\n${textData}`,
          },
          {
            text: prompt,
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

    const cleanedJson = cleanLLMJson(rawtext)

    const jsonResponse = JSON.parse(cleanedJson)



    
    console.log("Conversion complete ✅✅✅ .....")
    return jsonResponse
  } catch (error) {
    console.error("Error during Nova conversion:", error)
    throw error
  }
}


const TableCreationHelper = async (file:File,table_type:string)=>{

let extraction_prompt = "" 
let coversion_prompt = ""

switch (table_type) {
  case "ProfitAndLoss":
    extraction_prompt = PandLTextExtraction 
    coversion_prompt = PandLJSONConverter
    break;
  
  case "BalanceSheet":
    extraction_prompt = BalanceSheetTextExtraction
    coversion_prompt = tempBStable

  default:
    // extraction_prompt = PandLTextExtraction 
    // coversion_prompt = PandLJSONConverter
    break;
}

  const extracted_text = await TextExtractionFromPDF(file,extraction_prompt)

  console.log("This is raw data before json converter",extracted_text);

  // const jsonData = JSON.stringify(extracted_text)

  const tableData = await TableJSONConversion(extracted_text,coversion_prompt)



  return tableData
}



export async function POST(req: NextRequest) {

  const formData = await req.formData()
  const file = formData.get("file") as File

  const tableData = await TableCreationHelper(file,"BalanceSheet")


  return NextResponse.json({ parsed: tableData })
}
