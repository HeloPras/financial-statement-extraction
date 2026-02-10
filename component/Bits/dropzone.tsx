"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { downloadExcel } from "@/utils/api/excelexport"
import * as XLSX from "xlsx"
import { NodeEventTarget } from "events"

type DropZoneProps = {
  //   onFilesDrop: (files: File[]) => void;
  accept?: string[] // e.g. ['image/png', 'application/pdf']
  maxSizeMB?: number // file size limit
  multiple?: boolean
}

type ExtractTableTypes = {
  PandL: boolean
  BalanceSheet: boolean
  CashFlow: boolean
}

const tablesToBeExtracted = ["PandL", "BalanceSheet", "CashFlow"]

const DropZone: React.FC<DropZoneProps> = ({
  //   onFilesDrop,
  accept = [],
  maxSizeMB = 10,
  multiple = true,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [dropped, setDropped] = useState(false)
  const [loading, setLoading] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const removeRef = useRef<HTMLButtonElement>(null)

  const [excel, setExcel] = useState<{
    title: string
    workbook: XLSX.WorkBook | null
  }>({ title: "", workbook: null })
  const [extractTables, setExtractTables] = useState<ExtractTableTypes>({

    PandL: false,

    BalanceSheet: false,

    CashFlow: false,

  })

  const validateFiles = (files: File[]) => {
    return files.filter((file) => {
      const isValidType = accept.length === 0 || accept.includes(file.type)

      const isValidSize = file.size <= maxSizeMB * 1024 * 1024

      return isValidType && isValidSize
    })
  }

  useEffect(() => {
    console.log("this is the extract tables", extractTables)
  }, [extractTables])

  const handleFiles = async (files: FileList | null) => {
    console.log("This is the form state", file)

    if (!files) return
    const validFiles = validateFiles(Array.from(files))
    setDropped(true)
    // onFilesDrop(validFiles);
    console.log("this is the valid files", validFiles)

    // setForm(new FormData() )
    const form = new FormData()
    form.append("file", validFiles[0])
    form.append("tablesToExtract", JSON.stringify(extractTables))


    setLoading(true)

    const response = await fetch("/api/extraction", {
      method: "POST",
      body: form,
    })

    if (!response.ok) {
      setLoading(false)
      console.error("API Error:", response.status, response.statusText)
      // Try to parse error as JSON, fallback to text
      try {
        const errorData = await response.json()
        console.error("Error details:", errorData)
        setLoading(false)
      } catch {
        const errorText = await response.text()
        console.error("Error response:", errorText)

        setLoading(false)
      }
      return
    }

    const data = await response.json()
    console.log("this is the received data from api", data)

    downloadExcel(data,extractTables, setExcel)
    setLoading(false)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [])

  return (
    <>
    <div className="max-w-[1500px]  mx-auto">
      {!loading ? (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => {
            !dropped ? inputRef.current?.click() : removeRef.current?.click()
          }}
          className={`flex flex-col items-center justify-center
        border-2 border-dashed rounded-xl p-8 cursor-pointer
        transition
        ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"}
      `}
        >
          <input
            ref={inputRef}
            disabled={dropped}
            type="file"
            hidden
            multiple={multiple}
            accept={accept.join(",")}
            onChange={() => setDropped(true)}
          />



          {dropped ? (
            <button
              className=""
              ref={removeRef}
              onClick={(e) => {
                e.stopPropagation() // 1. Prevents the parent div from opening the file picker
                if (inputRef.current) {
                  inputRef.current.value = "" // 2. Clears the actual file from the HTML input
                }
                setDropped(false) // 3. Resets your UI state
                setFile(null)
              }}
            >
              Remove file
            </button>
          ) : (
            <div>
              <p className="text-sm text-gray-600">
                Drag & drop files here, or{" "}
                <span className="font-semibold">click to upload</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Max size: {maxSizeMB}MB
              </p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p>Processing...</p>
        </div>
      )}

      <div className="flex items-center gap-6">
        
        <div className="flex items-center gap-1 ">
        <label htmlFor="selectall">Select All</label>
        <input
          type="checkbox"
          value="selectall"
          name="selectall"
          onChange={(e) => {
            setExtractTables({
              PandL: e.target.checked,
              BalanceSheet: e.target.checked,
              CashFlow: e.target.checked,
            })
          }}
        /></div>

        {tablesToBeExtracted.map((table) => {
          return (
            <div className="flex items-center gap-1">
              <label htmlFor={table}>{table}</label>
              <input
                type="checkbox"
                name={table}
                value={table}
                checked={extractTables[table as keyof ExtractTableTypes]}
                onChange={(e) => {
                  setExtractTables({
                    ...extractTables,
                    [table as keyof ExtractTableTypes]: e.target.checked,
                  })
                }}
              />
            </div>
          )
        })}
      </div>

      <button className="mt-4 px-4 py-2  bg-green-500 text-white rounded-lg mx-2" onClick={() => handleFiles(inputRef.current?.files||null)}>
        Extract
      </button>

      {excel.workbook !== null && (
        <button
          onClick={() => {
            if (excel.workbook === null) return
            XLSX.writeFile(excel.workbook, `${excel.title}.xlsx`)
          }}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          Download
        </button>
      )}</div>
    </>
  )
}

export default DropZone
