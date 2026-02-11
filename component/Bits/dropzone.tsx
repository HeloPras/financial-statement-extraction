"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as XLSX from "xlsx"
import { downloadExcel } from "@/utils/api/excelexport"

type DropZoneProps = {
  accept?: string[]
  maxSizeMB?: number
  multiple?: boolean
}

type ExtractTableTypes = {
  PandL: boolean
  BalanceSheet: boolean
  CashFlow: boolean
}

const TABLES: Array<keyof ExtractTableTypes> = ["PandL", "BalanceSheet", "CashFlow"]

const formatBytes = (bytes: number) => {
  const sizes = ["B", "KB", "MB", "GB"]
  if (!bytes) return "0 B"
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`
}

const DropZone: React.FC<DropZoneProps> = ({
  accept = ["application/pdf"],
  maxSizeMB = 10,
  multiple = false,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")

  const inputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [excel, setExcel] = useState<{ title: string; workbook: XLSX.WorkBook | null }>({
    title: "",
    workbook: null,
  })

  const [extractTables, setExtractTables] = useState<ExtractTableTypes>({
    PandL: true,
    BalanceSheet: true,
    CashFlow: true,
  })

  const selectedCount = useMemo(
    () => Object.values(extractTables).filter(Boolean).length,
    [extractTables]
  )

  const validateFiles = (files: File[]) => {
    const valid: File[] = []
    const errors: string[] = []

    for (const f of files) {
      const isValidType = accept.length === 0 || accept.includes(f.type)
      const isValidSize = f.size <= maxSizeMB * 1024 * 1024

      if (!isValidType) errors.push(`${f.name}: unsupported type (${f.type || "unknown"})`)
      else if (!isValidSize) errors.push(`${f.name}: too large (${formatBytes(f.size)})`)
      else valid.push(f)
    }

    return { valid, errors }
  }

  const resetAll = () => {
    setError("")
    setSuccess("")
    setFile(null)
    setExcel({ title: "", workbook: null })
    if (inputRef.current) inputRef.current.value = ""
  }

  const handlePick = (files: FileList | null) => {
    setError("")
    setSuccess("")
    setExcel({ title: "", workbook: null })

    if (!files || files.length === 0) return

    const { valid, errors } = validateFiles(Array.from(files))
    if (errors.length) {
      setError(errors.slice(0, 3).join(" • ") + (errors.length > 3 ? ` • +${errors.length - 3} more` : ""))
    }
    if (!valid.length) return

    // Use first file (you can extend later to multiple)
    setFile(valid[0])
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handlePick(e.dataTransfer.files)
    },
    [accept, maxSizeMB]
  )

  const extract = async () => {
    setError("")
    setSuccess("")
    setExcel({ title: "", workbook: null })

    if (!file) {
      setError("Please upload a PDF file first.")
      return
    }
    if (selectedCount === 0) {
      setError("Please select at least one statement to extract.")
      return
    }

    const form = new FormData()
    form.append("file", file)
    form.append("tablesToExtract", JSON.stringify(extractTables))

    setLoading(true)
    try {
      const response = await fetch("/api/extraction", { method: "POST", body: form })

      if (!response.ok) {
        let msg = `Request failed (${response.status}).`
        try {
          const err = await response.json()
          msg = err?.message || err?.error || msg
        } catch {
          const txt = await response.text()
          if (txt) msg = txt
        }
        setError(msg)
        return
      }

      const data = await response.json()
      downloadExcel(data, extractTables, setExcel)
      setSuccess("Extraction completed. You can download the Excel file now.")
    } catch (e: any) {
      setError(e?.message || "Something went wrong while extracting.")
    } finally {
      setLoading(false)
    }
  }



  const allChecked = selectedCount === TABLES.length
  const someChecked = selectedCount > 0 && !allChecked

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="rounded-2xl border bg-white shadow-sm">
        {/* Header */}
        <div className="flex flex-col gap-1 border-b px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900">PDF Financial Statement Extractor</h2>
          <p className="text-sm text-gray-600">
            Upload a report, choose the statements, then extract to Excel.
          </p>
        </div>

        <div className="grid gap-6 px-6 py-6 md:grid-cols-2">
          {/* Left: Dropzone */}
          <div>
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
              }}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={[
                "group rounded-2xl border-2 border-dashed p-6 transition",
                "cursor-pointer outline-none focus:ring-2 focus:ring-blue-300",
                isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50",
              ].join(" ")}
            >
              <input
                ref={inputRef}
                type="file"
                hidden
                multiple={multiple}
                accept={accept.join(",")}
                onChange={(e) => handlePick(e.target.files)}
              />

              {!file ? (
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="rounded-full border bg-white px-3 py-1 text-xs text-gray-700">
                    PDF • Max {maxSizeMB}MB
                  </div>
                  <div className="mt-1 text-sm text-gray-700">
                    Drag & drop your file here, or{" "}
                    <span className="font-semibold text-gray-900">click to browse</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Tip: cleaner (non-scanned) PDFs extract better.
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
                    <p className="mt-1 text-xs text-gray-600">
                      {formatBytes(file.size)} • {file.type || "unknown type"}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      Click here to replace the file.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      resetAll()
                    }}
                    className="shrink-0 rounded-xl border bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Alerts */}
            {(error || success) && (
              <div className="mt-4 space-y-2">
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                    {success}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Options + Actions */}
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Statements to extract</p>
                  <p className="text-xs text-gray-600">Select one or more.</p>
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = someChecked
                    }}
                    onChange={(e) => {
                      const v = e.target.checked
                      setExtractTables({ PandL: v, BalanceSheet: v, CashFlow: v })
                    }}
                    className="h-4 w-4"
                  />
                  Select all
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {TABLES.map((k) => {
                  const checked = extractTables[k]
                  return (
                    <label
                      key={k}
                      className={[
                        "flex items-center gap-2 rounded-full border px-3 py-2 text-sm select-none transition",
                        checked ? "border-blue-300 bg-blue-50 text-blue-900" : "border-gray-200 bg-white text-gray-800",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setExtractTables({ ...extractTables, [k]: e.target.checked })}
                        className="h-4 w-4"
                      />
                      {k === "PandL" ? "P&L" : k === "BalanceSheet" ? "Balance Sheet" : "Cash Flow"}
                    </label>
                  )
                })}
              </div>

              <div className="mt-4 text-xs text-gray-600">
                Selected: <span className="font-semibold">{selectedCount}</span> / {TABLES.length}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={extract}
                disabled={loading || !file || selectedCount === 0}
                className={[
                  "rounded-2xl px-4 py-3 text-sm font-semibold text-white transition",
                  "shadow-sm",
                  loading || !file || selectedCount === 0
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700",
                ].join(" ")}
              >
                {loading ? "Extracting…" : "Extract to Excel"}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!excel.workbook) return
                  XLSX.writeFile(excel.workbook, `${excel.title || "extracted"}.xlsx`)
                }}
                disabled={!excel.workbook || loading}
                className={[
                  "rounded-2xl px-4 py-3 text-sm font-semibold transition",
                  "border shadow-sm",
                  !excel.workbook || loading
                    ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-white text-gray-900 border-gray-200 hover:bg-gray-50",
                ].join(" ")}
              >
                Download Excel
              </button>

              <button
                type="button"
                onClick={resetAll}
                disabled={loading && !excel.workbook}
                className="rounded-2xl border bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Reset
              </button>
            </div>

            <div className="rounded-2xl border bg-gray-50 p-4 text-xs text-gray-600">
              <p className="font-semibold text-gray-800">Notes</p>
              <ul className="mt-2 list-disc pl-4 space-y-1">
                <li>For best results, use non-scanned PDFs with clear tables.</li>
                <li>If formats vary widely, expect some items to land in the exceptions bucket (if you have one).</li>
                <li>You can extend this UI to handle multiple PDFs as a batch later.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 text-xs text-gray-500">
          Accepted types: {accept.length ? accept.join(", ") : "any"} • Max size: {maxSizeMB}MB
        </div>
      </div>
    </div>
  )
}

export default DropZone
