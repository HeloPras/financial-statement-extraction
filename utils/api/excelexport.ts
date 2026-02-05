import { Dispatch, SetStateAction } from "react"
import * as XLSX from "xlsx"

type FinancialTable = {
  table_title: string
  columns: string[]
  rows: Record<string, string | number | null>[]
}

function resolveFinancialTable(data: any) {
  // this function fixes the name of the payload if its balance_sheet, pl or anything else

  const tableKeys = Object.keys(data).filter(
    (key) =>
      key.endsWith("_tables") &&
      Array.isArray(data[key]) &&
      data[key].length > 0,
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

const renameTableColumns = (data: FinancialTable) => {

  console.log("We are inside the renaming table function yaay 😘😘😘😘");
  

  for (const reference of data.columns) {
    for (let i = 1; i < data.columns.length; i++) {
      if (reference == data.columns[i]) {
        data.columns[i] = reference + "_" + i
      }
    }
  }

  const rowKeys = Object.keys(data.rows[0])
  console.log("this is the row keys",rowKeys)

  // for(let row of data.rows ){
  //   for(let key of rowKeys){

  //     row[data.columns[key]] = row[key]
  //   }
  // }

  data.rows.forEach((row: any) => {
    for (const key of rowKeys) {
      let count = 0
      row[data.columns[count]] = row[key]
      delete row[key]
      count++
      if (count == rowKeys.length) {
        count = 0
      }
    }
  })

  console.log("this is the data after renaming",data)

  return data
}

function toNumber(value: string | number | null): string | number | null {
  // this function changes the value of cell from string to number

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

  const num = cleaned.includes(".")
    ? Number.parseFloat(cleaned)
    : Number.parseInt(cleaned, 10)
  const out = isParenNeg ? -Math.abs(num) : num

  return out
}

function convertTables(payload: { parsed: Record<string, any> }) {
  // this function chooses which column exclude from conversion like Particular table and calls toNumber function to convert string to number

  const labelCols = ["Particulars", "PARTICULARS"]

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

export function downloadExcel(
  data: any,
  func: Dispatch<
    SetStateAction<{ title: string; workbook: XLSX.WorkBook | null }>
  >,
) {
  let formattedData = convertTables(data)

  console.log("this is the formatted data", formattedData)

  // formattedData = renameTableColumns(formattedData)
  let { table, sheetName } = resolveFinancialTable(formattedData.parsed)

  console.log("Renaming columns starting.......😫😫")
  table = renameTableColumns(table)
  console.log("Renaming completed......✅✅✅")

  const worksheet = XLSX.utils.json_to_sheet(table.rows)
  const workbook = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  XLSX.writeFile(workbook, `${table.table_title || "Extraction"}.xlsx`)

  func({ title: table.table_title || "Extraction", workbook })
}
