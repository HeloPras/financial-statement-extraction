import { Dispatch, SetStateAction } from "react"
import * as XLSX from "xlsx"

function resolveFinancialTable(data: any) {
  const tableKeys = Object.keys(data).filter(
    (key) => key.endsWith("_tables") && Array.isArray(data[key]) && data[key].length > 0
  )

  if (tableKeys.length === 0) {
    throw new Error("No financial tables found")
  }

  const tableKey = tableKeys[0] // first available table
  const table = data[tableKey][0]

  const sheetName = tableKey
    .replace("_tables", "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return { table, sheetName }
}


export function downloadExcel(
  data: any,
  func: Dispatch<SetStateAction<{ title: string; workbook: XLSX.WorkBook | null }>>
) {
  const { table, sheetName } = resolveFinancialTable(data)

  const worksheet = XLSX.utils.json_to_sheet(table.rows)
  const workbook = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  XLSX.writeFile(workbook, `${table.table_title || "Extraction"}.xlsx`)

  func({ title: table.table_title || "Extraction", workbook })
}


function toNumber(value: string | number | null): string | number | null {
  
  // console.log("toNumber input:", value, "type:", typeof value)

  if (value === null || value === undefined) return null
  if (typeof value === "number") return value

  let s = String(value).trim()
  // console.log("string after trim:", JSON.stringify(s))

  const lower = s.toLowerCase()
  if (s === "" || s === "-" || s === "—" || lower === "n/a" || lower === "na")
    return null

  const isParenNeg = s.startsWith("(") && s.endsWith(")")
  if (isParenNeg) s = s.slice(1, -1).trim()

  // normalize weird spaces and minus characters
  s = s.replace(/\u00A0/g, " ") // NBSP -> space
  s = s.replace(/[−–—]/g, "-") // different minus/dash -> '-'
  s = s.replace(/,/g, "")

  const cleaned = s.replace(/[^0-9.\-]/g, "")
  // console.log("cleaned:", JSON.stringify(cleaned), "isParenNeg:", isParenNeg)

  // if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
  //   console.log("NOT numeric -> returning original")
  //   return value
  // }

  const num = cleaned.includes(".")
    ? Number.parseFloat(cleaned)
    : Number.parseInt(cleaned, 10)
  const out = isParenNeg ? -Math.abs(num) : num

  // console.log("converted ->", out)
  return out
}

type FinancialTable = {
  table_title: string
  columns: string[]
  rows: Record<string, string | number | null>[]
}

export function convertTables(payload: { parsed: Record<string, any> }) {
  const labelCols = ["Particulars",'PARTICULARS']

  for (const [key, tables] of Object.entries(payload.parsed ?? {})) {
    if (!key.endsWith("_tables") || !Array.isArray(tables)) continue

    for (const table of tables as FinancialTable[]) {
      for (const row of table.rows ?? []) {
        for (const col of Object.keys(row)) {
          if (labelCols.includes(col)) continue
          row[col] = toNumber(row[col])
        }
      }
    }
  }

  return payload
}
