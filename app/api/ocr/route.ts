import { NextRequest, NextResponse } from "next/server"
import { createCanvas } from "canvas"
import Tesseract from "tesseract.js"

export const runtime = "nodejs"

// Polyfill DOMMatrix for PDF.js in Node.js environment
if (typeof global.DOMMatrix === "undefined") {
  // Simple DOMMatrix polyfill for PDF.js
  global.DOMMatrix = class DOMMatrix {
    a: number
    b: number
    c: number
    d: number
    e: number
    f: number

    constructor(a = 1, b = 0, c = 0, d = 1, e = 0, f = 0) {
      this.a = a
      this.b = b
      this.c = c
      this.d = d
      this.e = e
      this.f = f
    }
  } as any
}

import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs"

// Configure PDF.js for Node.js environment (no worker needed)
pdfjs.GlobalWorkerOptions.workerSrc = ""

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    const pdf = await pdfjs.getDocument({
      data: uint8Array,
      disableWorker: true,
      isEvalSupported: false,
    } as any).promise

    let fullText = ""
    const MIN_TEXT_THRESHOLD = 50 // Minimum characters to consider text extraction successful

    console.log(`Processing PDF with ${pdf.numPages} pages...`)

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      console.log(`Processing page ${pageNum}/${pdf.numPages}...`)
      const page = await pdf.getPage(pageNum)

      // First, try to extract text directly (faster for text-based PDFs)
      const textContent = await page.getTextContent()
      const extractedText = textContent.items
        .map((item: any) => item.str)
        .join(" ")
        .trim()

      let pageText = ""

      // If sufficient text was extracted, use it; otherwise, use OCR
      if (extractedText.length >= MIN_TEXT_THRESHOLD) {
        console.log(
          `Page ${pageNum}: Using direct text extraction (${extractedText.length} chars)`,
        )
        pageText = extractedText
      } else {
        console.log(`Page ${pageNum}: Using OCR (scanned image detected)`)

        // Render page to canvas for OCR
        const viewport = page.getViewport({ scale: 2.0 }) // Higher scale for better OCR accuracy
        const canvas = createCanvas(viewport.width, viewport.height)
        const context = canvas.getContext("2d")

        await page.render({
          canvasContext: context as any,
          viewport,
          canvas: canvas as any,
        }).promise

        const imageBuffer = canvas.toBuffer()

        // Perform OCR with enhanced configuration
        const {
          data: { text },
        } = await Tesseract.recognize(imageBuffer, "eng", {
          logger: (m) => {
            if (m.status === "recognizing text") {
              console.log(
                `Page ${pageNum} OCR progress: ${Math.round(m.progress * 100)}%`,
              )
            }
          },
        })

        pageText = text.trim()
      }

      fullText += `\n\n--- Page ${pageNum} ---\n${pageText}`
    }

    console.log("PDF processing completed successfully")
    return NextResponse.json({ text: fullText })
  } catch (error) {
    console.error("OCR Error:", error)
    return NextResponse.json(
      {
        error: "Failed to extract text from PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
