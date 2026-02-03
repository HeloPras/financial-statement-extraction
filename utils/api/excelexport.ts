import { Dispatch, SetStateAction } from "react"
import * as XLSX from "xlsx"

export function downloadExcel(data: any,func:Dispatch<SetStateAction<{title:string,workbook:XLSX.WorkBook | null}>>) {

  // 1. Extract the rows from your specific JSON structure
  const tableData = data.profit_and_loss_tables[0]
  const rows = tableData.rows

  // 2. Create a worksheet from the JSON array
  const worksheet = XLSX.utils.json_to_sheet(rows)

  // 3. Create a workbook and add the worksheet
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Profit and Loss")

  // 4. Generate buffer and trigger download
  XLSX.writeFile(workbook, `${tableData.table_title || "Extraction"}.xlsx`)
  func({title:tableData.table_title || "Extraction",workbook})

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

export function convertTables(payload: {parsed:{
  profit_and_loss_tables: {
    table_title: string
    columns:string[]
    rows: Record<string, string | number | null>[]
  }[]}
}): any {
    const labelCols = ['Particulars']
    for (let table of payload?.parsed?.profit_and_loss_tables ?? []) {
      for (let row of table?.rows ?? []) {
        for (let key of Object.keys(row)) {
          if (labelCols.includes(key)) continue
          row[key] = toNumber(row[key])

        }
      }
    }
    // console.log("this is the payload", payload)
    return payload // helpful to return it (even though it mutates in place)
  }
