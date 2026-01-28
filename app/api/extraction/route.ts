import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime"
import { NextRequest, NextResponse } from "next/server"

const client = new BedrockRuntimeClient({
  region: "us-east-1",
  requestHandler: {
    requestTimeout: 300_000, // Increase to 5 minutes for heavy multimodal tasks
  },
})

export function POST(req: NextRequest) {
  return analyzeMultiplePDFs(req)
}
async function analyzeMultiplePDFs(req: NextRequest) {
  // Load your PDF files as Buffers

  const formData = await req.formData()
  const file = formData.get("file") as File

  console.log("Waiting for response ...")

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
          //    {
          //     document: {
          //       name: "ContractV2",
          //       format: "pdf",
          //       source: { bytes: new Uint8Array(file) }
          //     }
          //   },
          {
            text: `You are a deterministic table extraction engine.

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
      "columns": ["<exact column text>"],
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

`,
          },
        ],
      },
    ],
    inferenceConfig: {
      maxTokens: 5000,
      temperature: 0,
      topP: 1,
    },
  })

  const response = await client.send(command)
  const rawtext = response.output?.message?.content?.[0]?.text || ""

  const parsed = JSON.parse(rawtext)

  return NextResponse.json({ parsed: parsed })
}
