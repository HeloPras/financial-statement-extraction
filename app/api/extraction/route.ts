import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime"
import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai";

const client = new BedrockRuntimeClient({
  region: "us-east-1",
  requestHandler: {
    requestTimeout: 300_000, // Increase to 5 minutes for heavy multimodal tasks
  },
})

const tableprompt = `You are a deterministic table extraction engine.

Your task is to extract a **Profit and Loss (P&L) table** from the provided file and return it as JSON.

Accepted table titles include:
"Profit and Loss", "Profit & Loss Account", "Income Statement", "Statement of Profit or Loss".
If no such table exists, return an empty array.

RULES (MUST BE FOLLOWED EXACTLY AND IN ORDER):

1. Identify the Profit and Loss table.
2. Extract every row and every column that appears inside that table.
3. Each cell MUST be treated as independent.
   - NEVER copy, infer, propagate, forward-fill, back-fill, or reuse values from any other cell.
4. Do NOT add, remove, rename, merge, split, infer, or reword any row names or column names.
5. Preserve the original order of rows and columns exactly.
6. If you are unsure whether a row belongs to the P&L table, exclude it.
7. If a cell is empty in the table, return an empty string "".

MANDATORY VALUE TRANSFORMATION:
8. After extraction, apply the following transformation to each cell value:
   - If the cell value is exactly "-", replace it with "0".
   - Remove all comma characters (",") from the cell value.
9. These transformations MUST NOT be applied to row names or column headers.
10. No other transformations, calculations, aggregation, or interpretation are allowed.

OUTPUT REQUIREMENTS:
- Output valid JSON only.
- No explanations.
- No markdown.
- Use strings for all values.

OUTPUT FORMAT:
{
  "profit_and_loss_tables": [
    {
      "table_title": "<exact title text or null>",
      "columns": ["<exact column text or "empty string">"],
      "rows": [
        {
          "<exact column text>": "<cell text after mandatory transformation>"
        }
      ]
    }
  ]
}

FINAL VERIFICATION (REQUIRED):
Before returning the output, confirm that:
- Every cell value comes from the same row and column intersection.
- No cell value was copied from an adjacent row or column.
- The only modification applied was the mandatory transformation.
If verification fails for a row, omit that row.
`

const paperPrompt = `You are a deterministic text extraction engine.

Your task is to extract text ONLY from Pages that contain a
Profit and Loss statement.

ACCEPTED TITLES (case-insensitive, must appear as a standalone line):
"Profit and Loss"
"Profit & Loss"
"Profit and Loss Account"
"Statement of Profit or Loss"

EXCLUSION RULE:
If a page title contains any of the following, DO NOT extract from that page:
"Balance Sheet"
"Statement of Financial Position"
"Cash Flow"
"Cash Flow Statement"

RULES (MUST FOLLOW EXACTLY):

1. Process the document page by page.
2. Select ONLY pages whose title matches one of the accepted titles.
3. Ignore all other pages completely.
4. From each selected page, read the text line by line in visual order (top to bottom).
5. For each line:
   - Split the line into words using whitespace as the separator.
   - Do NOT merge lines.
   - Do NOT split a line into multiple lines.
   - Do NOT infer, reword, or normalize text.
6. If a line contains no text, return an empty array [].
7. Each line must be handled independently.

OUTPUT REQUIREMENTS:
- Output JSON only.
- No explanations.
- No markdown.
- Preserve original word order.
- Use strings only.

OUTPUT FORMAT:
{
  "profit_and_loss_pages": [
    {
      "page_number": <number>,
      "lines": [
        ["word1", "word2", "word3"]
      ]
    }
  ]
}

FINAL VERIFICATION:
Before returning output, confirm that:
- Every extracted line comes from a Profit and Loss page only.
- No lines from Balance Sheet or Cash Flow pages are included.
- Each inner array represents exactly one original line.
If verification fails for a page, omit that page entirely.

`

const tablePrompt = `

You are a deterministic table-structuring engine.

Your task is to identify and structure the **Profit and Loss (P&L) table**
from the provided content and return it in the exact JSON format specified below.

SCOPE RESTRICTION (CRITICAL):
- Process ONLY content that belongs to a Profit and Loss statement.
- Do NOT extract or include any data from:
  - Balance Sheet
  - Statement of Financial Position
  - Cash Flow / Cash Flow Statement
- If the content is not clearly part of a P&L table, ignore it.

IDENTIFICATION RULES:
- The table title may be:
  "Profit and Loss"
  "Profit & Loss"
  "Profit and Loss Account"
  "Statement of Profit or Loss"
- If no P&L table is found, return an empty array.

TABLE EXTRACTION RULES:
1. Extract the table exactly as it appears.
2. Do NOT add, remove, rename, merge, split, infer, or reorder:
   - columns
   - rows
   - headers
   - values
3. Preserve the original column order and row order.
4. Each row represents a single logical row in the table.
5. Each cell must come from the exact row–column intersection.
6. NEVER copy or borrow values from adjacent rows or columns.
7. If a column header is missing, use an empty string "" as the column name.
8. If a cell is empty, return an empty string "".

OUTPUT RULES:
- Output valid JSON only.
- No explanations.
- No markdown.
- Use strings for all values.
- No JSON identifiers. 

OUTPUT FORMAT (MUST MATCH EXACTLY):
{
  "profit_and_loss_tables": [
    {
      "table_title": "<exact title text or null>",
      "columns": ["<exact column text or empty string>"],
      "rows": [
        {
          "<exact column text>": "<cell text>"
        }
      ]
    }
  ]
}

FINAL VERIFICATION (REQUIRED):
Before returning the output, verify that:
- Every column and row exists in the original P&L table.
- No data from non–P&L statements is included.
- No values were copied across rows or columns.
- The only modification applied was the mandatory value transformation.
If any verification fails, omit the affected row.

`

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
            text: paperPrompt,
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
  console.log(rawtext)

  const parsed = JSON.parse(rawtext)

  console.log(parsed)

  console.log("Extraction Complete ✅✅✅ .....")

  // return NextResponse.json({rawtext: rawtext ,parsed: parsed })
  return NextResponse.json({ data: parsed })
}




// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const TableJSONConversion = async (textData: any) => {
  console.log("Converting text into JSON....");

  // Choose the model (gemini-1.5-flash is ideal for fast data extraction)
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    // This ensures the output is strictly valid JSON
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 100000,
      temperature: 0,
      topP: 1,
    }
  });

  try {
    const result = await model.generateContent([
      { text: textData },
      { text: tablePrompt }, // Ensure 'tablePrompt' is defined in your scope
    ]);

    const response = result.response;
    

    const jsonResponse = JSON.parse(response.text());
    console.log("this is the json response",jsonResponse);
    
    console.log("Conversion complete ✅✅✅ .....")
    return jsonResponse;
  } catch (error) {
    console.error("Error during Gemini conversion:", error);
    throw error;
  }
};



export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get("file") as File

  const rawResponse = await TextExtractionFromPDF(file)
  const rawData = await   rawResponse.json()
  const jsonData = JSON.stringify(rawData)

  console.log("This is raw data",rawData);
  
  console.log("this is the json data",jsonData)

  const tableData = await TableJSONConversion(jsonData)

  return NextResponse.json({ parsed: tableData })
}
