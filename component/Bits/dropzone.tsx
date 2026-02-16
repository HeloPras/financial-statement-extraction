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
  Historical:boolean
  PandL: boolean
  BalanceSheet: boolean
  CashFlow: boolean

}

const TABLES: Array<keyof ExtractTableTypes> = [
  "PandL",
  "BalanceSheet",
  "CashFlow",

]

const formatBytes = (bytes: number) => {
  const sizes = ["B", "KB", "MB", "GB"]
  if (!bytes) return "0 B"
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`
}

const DropZone: React.FC<DropZoneProps> = ({
  accept = ["application/pdf"],
  maxSizeMB = 10,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")

  const inputRef = useRef<HTMLInputElement>(null)

  const [files, setFiles] = useState<File[] | null>(null)
  const [excel, setExcel] = useState<{
    title: string
    workbook: XLSX.WorkBook | null
  }>({
    title: "",
    workbook: null,
  })

  useEffect(() => {
    console.log(files)
  }, [files])

  const [extractTables, setExtractTables] = useState<ExtractTableTypes>({
    Historical:false,
    PandL: true,
    BalanceSheet: true,
    CashFlow: true,
  })

const selectedCount = useMemo(() => {
  return TABLES.filter((k) => extractTables[k]).length
}, [extractTables])

  const validateFiles = (files: File[]) => {
    const valid: File[] = []
    const errors: string[] = []

    for (const f of files) {
      const isValidType = accept.length === 0 || accept.includes(f.type)
      const isValidSize = f.size <= maxSizeMB * 1024 * 1024

      if (!isValidType)
        errors.push(`${f.name}: unsupported type (${f.type || "unknown"})`)
      else if (!isValidSize)
        errors.push(`${f.name}: too large (${formatBytes(f.size)})`)
      else valid.push(f)
    }

    return { valid, errors }
  }

  const resetAll = () => {
    setError("")
    setSuccess("")
    setFiles(null)
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
      setError(
        errors.slice(0, 3).join(" • ") +
          (errors.length > 3 ? ` • +${errors.length - 3} more` : ""),
      )
    }

    if (!valid.length) return

    // Use first file (you can extend later to multiple)
    setFiles(valid)
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handlePick(e.dataTransfer.files)
    },
    [accept, maxSizeMB],
  )

  const extract = async () => {
    setError("")
    setSuccess("")
    setExcel({ title: "", workbook: null })

    if (!files) {
      setError("Please upload a PDF file first.")
      return
    }
    if (selectedCount === 0) {
      setError("Please select at least one statement to extract.")
      return
    }

//     const responseData = [
//     {
//         "name": "Radiant Infotech_Provisional_Poush, 2082.pdf",
//         "status": "success",
//         "data": {
//             "ProfitAndLoss": {
//                 "profit_and_loss_tables": [
//                     {
//                         "table_title": "M/S Radiant Infotech Nepal Pvt. Ltd.\nKathmandu, Nepal\n\nStatement of Income\nAs at 30th Poush 2082 (14th January 2026)",
//                         "columns": [
//                             "Particulars",
//                             "Notes",
//                             "F.Y. 2082-83",
//                             "F.Y. 2081-82"
//                         ],
//                         "rows": [
//                             {
//                                 "Particulars": "Income",
//                                 "Notes": "",
//                                 "F.Y. 2082-83": "",
//                                 "F.Y. 2081-82": ""
//                             },
//                             {
//                                 "Particulars": "Revenue from Operations",
//                                 "Notes": "4.11",
//                                 "F.Y. 2082-83": "4,77,19,213",
//                                 "F.Y. 2081-82": "16,09,63,917"
//                             },
//                             {
//                                 "Particulars": "Other Income",
//                                 "Notes": "",
//                                 "F.Y. 2082-83": "-",
//                                 "F.Y. 2081-82": "-"
//                             },
//                             {
//                                 "Particulars": "Total Income",
//                                 "Notes": "",
//                                 "F.Y. 2082-83": "4,77,19,213",
//                                 "F.Y. 2081-82": "16,09,63,917"
//                             },
//                             {
//                                 "Particulars": "Expenses",
//                                 "Notes": "",
//                                 "F.Y. 2082-83": "",
//                                 "F.Y. 2081-82": ""
//                             },
//                             {
//                                 "Particulars": "Cost of Sales",
//                                 "Notes": "4.12",
//                                 "F.Y. 2082-83": "2,63,91,650",
//                                 "F.Y. 2081-82": "9,98,04,646"
//                             },
//                             {
//                                 "Particulars": "Employee Benefit Expenses",
//                                 "Notes": "4.13",
//                                 "F.Y. 2082-83": "53,61,000",
//                                 "F.Y. 2081-82": "97,48,000"
//                             },
//                             {
//                                 "Particulars": "Administrative and Operating Expenses",
//                                 "Notes": "4.14",
//                                 "F.Y. 2082-83": "43,83,494",
//                                 "F.Y. 2081-82": "78,84,676"
//                             },
//                             {
//                                 "Particulars": "Other Expenses",
//                                 "Notes": "",
//                                 "F.Y. 2082-83": "-",
//                                 "F.Y. 2081-82": "-"
//                             },
//                             {
//                                 "Particulars": "Finance Costs",
//                                 "Notes": "4.15",
//                                 "F.Y. 2082-83": "21,05,921",
//                                 "F.Y. 2081-82": "1,26,85,045"
//                             },
//                             {
//                                 "Particulars": "Depreciation and Amortization Expenses",
//                                 "Notes": "4.1.2",
//                                 "F.Y. 2082-83": "-",
//                                 "F.Y. 2081-82": "1,83,06,538"
//                             },
//                             {
//                                 "Particulars": "Total Expenses",
//                                 "Notes": "",
//                                 "F.Y. 2082-83": "3,82,42,065",
//                                 "F.Y. 2081-82": "14,84,28,905"
//                             },
//                             {
//                                 "Particulars": "Profit/(Loss) Before Tax",
//                                 "Notes": "",
//                                 "F.Y. 2082-83": "94,77,148",
//                                 "F.Y. 2081-82": "1,25,35,012"
//                             },
//                             {
//                                 "Particulars": "Income Tax Expense",
//                                 "Notes": "",
//                                 "F.Y. 2082-83": "18,95,430",
//                                 "F.Y. 2081-82": "30,61,016"
//                             },
//                             {
//                                 "Particulars": "Deferred Tax Expenses",
//                                 "Notes": "",
//                                 "F.Y. 2082-83": "",
//                                 "F.Y. 2081-82": "86782"
//                             },
//                             {
//                                 "Particulars": "Net Profit/(Loss) for the year",
//                                 "Notes": "",
//                                 "F.Y. 2082-83": "75,81,719",
//                                 "F.Y. 2081-82": "93,87,214"
//                             }
//                         ]
//                     }
//                 ]
//             },
//             "BalanceSheet": {
//                 "balance_sheet_tables": [
//                     {
//                         "table_title": "M/S Radiant Infotech Nepal Pvt. Ltd.\nKathmandu, Nepal\n\nStatement of Financial Position\nAs at 30th Posh 2082 (14th January 2026)",
//                         "columns": [
//                             "Particulars",
//                             "Notes",
//                             "As at 30th Posh 2082",
//                             "As at 32nd Aasadh 2082"
//                         ],
//                         "rows": [
//                             {
//                                 "Particulars": "ASSETS",
//                                 "Notes": "",
//                                 "As at 30th Posh 2082": "",
//                                 "As at 32nd Aasadh 2082": ""
//                             },
//                             {
//                                 "Particulars": "NON-CURRENT ASSETS",
//                                 "Notes": "",
//                                 "As at 30th Posh 2082": "",
//                                 "As at 32nd Aasadh 2082": ""
//                             },
//                             {
//                                 "Particulars": "Property, Plant and Equipment",
//                                 "Notes": "4.1",
//                                 "As at 30th Posh 2082": "4,66,35,869",
//                                 "As at 32nd Aasadh 2082": "4,66,35,869"
//                             },
//                             {
//                                 "Particulars": "Goodwill and Intangible Assets",
//                                 "Notes": "4.2",
//                                 "As at 30th Posh 2082": "22,59,45,804",
//                                 "As at 32nd Aasadh 2082": "22,59,45,804"
//                             },
//                             {
//                                 "Particulars": "Investments",
//                                 "Notes": "",
//                                 "As at 30th Posh 2082": "-",
//                                 "As at 32nd Aasadh 2082": "-"
//                             },
//                             {
//                                 "Particulars": "Deferred Tax Assets",
//                                 "Notes": "",
//                                 "As at 30th Posh 2082": "-",
//                                 "As at 32nd Aasadh 2082": "-"
//                             },
//                             {
//                                 "Particulars": "TOTAL NON-CURRENT ASSETS (A)",
//                                 "Notes": "",
//                                 "As at 30th Posh 2082": "27,25,81,673",
//                                 "As at 32nd Aasadh 2082": "27,25,81,673"
//                             },
//                             {
//                                 "Particulars": "CURRENT ASSETS",
//                                 "Notes": "",
//                                 "As at 30th Posh 2082": "",
//                                 "As at 32nd Aasadh 2082": ""
//                             },
//                             {
//                                 "Particulars": "Work in Progress",
//                                 "Notes": "4.3",
//                                 "As at 30th Posh 2082": "3,68,39,510",
//                                 "As at 32nd Aasadh 2082": "2,68,29,010"
//                             },
//                             {
//                                 "Particulars": "Trade and Other Receivables",
//                                 "Notes": "4.4",
//                                 "As at 30th Posh 2082": "9,28,10,100",
//                                 "As at 32nd Aasadh 2082": "9,11,74,223"
//                             },
//                             {
//                                 "Particulars": "Income Tax Receivables",
//                                 "Notes": "4.5",
//                                 "As at 30th Posh 2082": "(16,55,553)",
//                                 "As at 32nd Aasadh 2082": "(94,912)"
//                             },
//                             {
//                                 "Particulars": "Cash and Cash Equivalents",
//                                 "Notes": "4.6",
//                                 "As at 30th Posh 2082": "1,38,000",
//                                 "As at 32nd Aasadh 2082": "2,28,459"
//                             },
//                             {
//                                 "Particulars": "TOTAL CURRENT ASSETS (B)",
//                                 "Notes": "",
//                                 "As at 30th Posh 2082": "12,81,32,056",
//                                 "As at 32nd Aasadh 2082": "11,81,36,780"
//                             },
//                             {
//                                 "Particulars": "TOTAL ASSETS (A+B)",
//                                 "Notes": "",
//                                 "As at 30th Posh 2082": "40,07,13,729",
//                                 "As at 32nd Aasadh 2082": "39,07,18,452"
//                             },
//                             {
//                                 "Particulars": "EQUITY AND LIABILITIES",
//                                 "Notes": "",
//                                 "As at 30th Posh 2082": "",
//                                 "As at 32nd Aasadh 2082": ""
//                             },
//                             {
//                                 "Particulars": "EQUITY",
//                                 "Notes": "",
//                                 "As at 30th Posh 2082": "",
//                                 "As at 32nd Aasadh 2082": ""
//                             },
//                             {
//                                 "Particulars": "Shareholder's Capital",
//                                 "Notes": "4.7",
//                                 "As at 30th Posh 2082": "21,86,00,000",
//                                 "As at 32nd Aasadh 2082": "21,86,00,000"
//                             },
//                             {
//                                 "Particulars": "Retained Earnings",
//                                 "Notes": "4.8",
//                                 "As at 30th Posh 2082": "3,92,49,490",
//                                 "As at 32nd Aasadh 2082": "3,16,67,772"
//                             },
//                             {
//                                 "Particulars": "TOTAL EQUITY (C)",
//                                 "Notes": "",
//                                 "As at 30th Posh 2082": "25,78,49,490",
//                                 "As at 32nd Aasadh 2082": "25,02,67,772"
//                             },
//                             {
//                                 "Particulars": "NON-CURRENT LIABILITIES",
//                                 "Notes": "",
//                                 "As at 30th Posh 2082": "",
//                                 "As at 32nd Aasadh 2082": ""
//                             },
//                             {
//                                 "Particulars": "Long-Term Borrowings",
//                                 "Notes": "4.9",
//                                 "As at 30th Posh 2082": "8,50,85,734",
//                                 "As at 32nd Aasadh 2082": "8,51,85,734"
//                             },
//                             {
//                                 "Particulars": "Provision",
//                                 "Notes": "",
//                                 "As at 30th Posh 2082": "-",
//                                 "As at 32nd Aasadh 2082": "-"
//                             },
//                             {
//                                 "Particulars": "Deferred Tax Liabilities",
//                                 "Notes": "",
//                                 "As at 30th Posh 2082": "6,88,975",
//                                 "As at 32nd Aasadh 2082": "6,88,975"
//                             },
//                             {
//                                 "Particulars": "TOTAL NON-CURRENT LIABILITIES (D)",
//                                 "Notes": "",
//                                 "As at 30th Posh 2082": "8,57,74,709",
//                                 "As at 32nd Aasadh 2082": "8,58,74,709"
//                             },
//                             {
//                                 "Particulars": "CURRENT LIABILITIES",
//                                 "Notes": "",
//                                 "As at 30th Posh 2082": "",
//                                 "As at 32nd Aasadh 2082": ""
//                             },
//                             {
//                                 "Particulars": "Short-Term Borrowings",
//                                 "Notes": "4.9",
//                                 "As at 30th Posh 2082": "1,34,86,973",
//                                 "As at 32nd Aasadh 2082": "94,95,725"
//                             },
//                             {
//                                 "Particulars": "Trade and Other Payables",
//                                 "Notes": "4.10",
//                                 "As at 30th Posh 2082": "4,36,02,556",
//                                 "As at 32nd Aasadh 2082": "4,50,80,246"
//                             },
//                             {
//                                 "Particulars": "Income Tax Liabilities",
//                                 "Notes": "",
//                                 "As at 30th Posh 2082": "-",
//                                 "As at 32nd Aasadh 2082": "-"
//                             },
//                             {
//                                 "Particulars": "TOTAL CURRENT LIABILITIES (E)",
//                                 "Notes": "",
//                                 "As at 30th Posh 2082": "5,70,89,529",
//                                 "As at 32nd Aasadh 2082": "5,45,75,971"
//                             },
//                             {
//                                 "Particulars": "TOTAL LIABILITIES (F) = (D+E)",
//                                 "Notes": "",
//                                 "As at 30th Posh 2082": "14,28,64,238",
//                                 "As at 32nd Aasadh 2082": "14,04,50,680"
//                             },
//                             {
//                                 "Particulars": "TOTAL EQUITY AND LIABILITIES (C+F)",
//                                 "Notes": "",
//                                 "As at 30th Posh 2082": "40,07,13,729",
//                                 "As at 32nd Aasadh 2082": "39,07,18,452"
//                             }
//                         ]
//                     }
//                 ]
//             },
//             "CashFlow": {
//                 "cash_flow_tables": [
//                     {
//                         "table_title": "M/S Radiant Infotech Nepal Pvt. Ltd.\nKathmandu, Nepal\n\nStatement of Cash Flows\nFor the Year Ended 30th Poush 2082 (14th January 2026)",
//                         "columns": [
//                             "Particulars",
//                             "F.Y. 2082-83",
//                             "F.Y. 2081-82"
//                         ],
//                         "rows": [
//                             {
//                                 "Particulars": "CASH FLOWS FROM OPERATING ACTIVITIES",
//                                 "F.Y. 2082-83": "",
//                                 "F.Y. 2081-82": ""
//                             },
//                             {
//                                 "Particulars": "Net Profit/(Loss) for the year",
//                                 "F.Y. 2082-83": "94,77,148",
//                                 "F.Y. 2081-82": "1,25,35,012"
//                             },
//                             {
//                                 "Particulars": "Adjustment for:",
//                                 "F.Y. 2082-83": "",
//                                 "F.Y. 2081-82": ""
//                             },
//                             {
//                                 "Particulars": "Tax Expense",
//                                 "F.Y. 2082-83": "-",
//                                 "F.Y. 2081-82": "30,61,016"
//                             },
//                             {
//                                 "Particulars": "Depreciation on Property, Plant and Equipment",
//                                 "F.Y. 2082-83": "-",
//                                 "F.Y. 2081-82": "1,83,06,538"
//                             },
//                             {
//                                 "Particulars": "Impairment of Property, Plant and Equipment",
//                                 "F.Y. 2082-83": "-",
//                                 "F.Y. 2081-82": "-"
//                             },
//                             {
//                                 "Particulars": "Amortization of Intangible Assets",
//                                 "F.Y. 2082-83": "-",
//                                 "F.Y. 2081-82": "-"
//                             },
//                             {
//                                 "Particulars": "Interest Income",
//                                 "F.Y. 2082-83": "-",
//                                 "F.Y. 2081-82": "-"
//                             },
//                             {
//                                 "Particulars": "Dividend Income",
//                                 "F.Y. 2082-83": "-",
//                                 "F.Y. 2081-82": "-"
//                             },
//                             {
//                                 "Particulars": "Interest Expense",
//                                 "F.Y. 2082-83": "21,05,921",
//                                 "F.Y. 2081-82": "1,26,85,045"
//                             },
//                             {
//                                 "Particulars": "Working Capital Adjustments",
//                                 "F.Y. 2082-83": "",
//                                 "F.Y. 2081-82": ""
//                             },
//                             {
//                                 "Particulars": "Decrease/(Increase) in Work in Progress",
//                                 "F.Y. 2082-83": "(1,00,10,500)",
//                                 "F.Y. 2081-82": "2,67,40,202"
//                             },
//                             {
//                                 "Particulars": "Decrease/(Increase) in Trade and Other Receivables",
//                                 "F.Y. 2082-83": "(16,35,877)",
//                                 "F.Y. 2081-82": "(8,72,50,071)"
//                             },
//                             {
//                                 "Particulars": "Decrease/(Increase) in Income Tax Receivables",
//                                 "F.Y. 2082-83": "15,60,641",
//                                 "F.Y. 2081-82": "(4,75,211)"
//                             },
//                             {
//                                 "Particulars": "Increase/(Decrease) in Trade and Other Payables",
//                                 "F.Y. 2082-83": "(14,77,690)",
//                                 "F.Y. 2081-82": "1,14,63,511"
//                             },
//                             {
//                                 "Particulars": "Cash Generated from Operations",
//                                 "F.Y. 2082-83": "19,644",
//                                 "F.Y. 2081-82": "(29,33,958)"
//                             },
//                             {
//                                 "Particulars": "Interest Received",
//                                 "F.Y. 2082-83": "-",
//                                 "F.Y. 2081-82": "-"
//                             },
//                             {
//                                 "Particulars": "Income Tax Paid",
//                                 "F.Y. 2082-83": "(18,95,430)",
//                                 "F.Y. 2081-82": "(30,61,016)"
//                             },
//                             {
//                                 "Particulars": "NET CASH FLOWS FROM OPERATING ACTIVITIES (A)",
//                                 "F.Y. 2082-83": "(18,75,786)",
//                                 "F.Y. 2081-82": "(59,94,974)"
//                             },
//                             {
//                                 "Particulars": "CASH FLOW FROM INVESTING ACTIVITIES",
//                                 "F.Y. 2082-83": "",
//                                 "F.Y. 2081-82": ""
//                             },
//                             {
//                                 "Particulars": "Purchase of Property, Plant and Equipment",
//                                 "F.Y. 2082-83": "-",
//                                 "F.Y. 2081-82": "(9,86,16,324)"
//                             },
//                             {
//                                 "Particulars": "Purchase of Intangible Assets",
//                                 "F.Y. 2082-83": "-",
//                                 "F.Y. 2081-82": "-"
//                             },
//                             {
//                                 "Particulars": "Dividend Received",
//                                 "F.Y. 2082-83": "-",
//                                 "F.Y. 2081-82": "-"
//                             },
//                             {
//                                 "Particulars": "Proceeds from Disposal of Property, Plant and Equipment",
//                                 "F.Y. 2082-83": "-",
//                                 "F.Y. 2081-82": "-"
//                             },
//                             {
//                                 "Particulars": "NET CASH FLOWS FROM INVESTING ACTIVITIES (B)",
//                                 "F.Y. 2082-83": "-",
//                                 "F.Y. 2081-82": "(9,86,16,324)"
//                             },
//                             {
//                                 "Particulars": "CASH FLOW FROM FINANCING ACTIVITIES",
//                                 "F.Y. 2082-83": "",
//                                 "F.Y. 2081-82": ""
//                             },
//                             {
//                                 "Particulars": "Proceeds from Issue of Ordinary Shares",
//                                 "F.Y. 2082-83": "-",
//                                 "F.Y. 2081-82": "7,86,00,000"
//                             },
//                             {
//                                 "Particulars": "Proceeds from/(Repayment of) Borrowings",
//                                 "F.Y. 2082-83": "38,91,248",
//                                 "F.Y. 2081-82": "3,86,84,457"
//                             },
//                             {
//                                 "Particulars": "Interest Paid",
//                                 "F.Y. 2082-83": "(21,05,921)",
//                                 "F.Y. 2081-82": "(1,26,85,045)"
//                             },
//                             {
//                                 "Particulars": "Dividend Distribution",
//                                 "F.Y. 2082-83": "-",
//                                 "F.Y. 2081-82": "-"
//                             },
//                             {
//                                 "Particulars": "NET CASH FLOW FROM FINANCING ACTIVITIES (C)",
//                                 "F.Y. 2082-83": "17,85,327",
//                                 "F.Y. 2081-82": "10,45,99,412"
//                             },
//                             {
//                                 "Particulars": "Net Increase in Cash and Cash Equivalents (A+B+C)",
//                                 "F.Y. 2082-83": "(90,459)",
//                                 "F.Y. 2081-82": "(11,886)"
//                             },
//                             {
//                                 "Particulars": "Cash and Cash Equivalents at the Beginning",
//                                 "F.Y. 2082-83": "2,28,459",
//                                 "F.Y. 2081-82": "2,40,346"
//                             },
//                             {
//                                 "Particulars": "Effect of Exchange Rate changes on Cash and Cash Equivalents",
//                                 "F.Y. 2082-83": "-",
//                                 "F.Y. 2081-82": "-"
//                             },
//                             {
//                                 "Particulars": "Cash and Cash Equivalents at the End",
//                                 "F.Y. 2082-83": "1,38,000",
//                                 "F.Y. 2081-82": "2,28,459"
//                             }
//                         ]
//                     }
//                 ]
//             }
//         }
//     },
//     {
//         "name": "SAIL-2ndQuarterly-Report.pdf",
//         "status": "success",
//         "data": {
//             "ProfitAndLoss": {
//                 "profit_and_loss_tables": [
//                     {
//                         "table_title": "Statement of Standalone Profit or Loss and other Comprehensive Income",
//                         "columns": [
//                             "Particulars",
//                             "Poush End 2082",
//                             "Poush End 2081"
//                         ],
//                         "rows": [
//                             {
//                                 "Particulars": "Revenue",
//                                 "Poush End 2082": "878,621,946",
//                                 "Poush End 2081": "548,190,573"
//                             },
//                             {
//                                 "Particulars": "Cost of sales",
//                                 "Poush End 2082": "763,919,497",
//                                 "Poush End 2081": "452,783,310"
//                             },
//                             {
//                                 "Particulars": "Gross profit / (loss)",
//                                 "Poush End 2082": "114,702,449",
//                                 "Poush End 2081": "95,407,263"
//                             },
//                             {
//                                 "Particulars": "Other income",
//                                 "Poush End 2082": "3,783,981",
//                                 "Poush End 2081": "4,149,697"
//                             },
//                             {
//                                 "Particulars": "Administrative expenses",
//                                 "Poush End 2082": "29,871,319",
//                                 "Poush End 2081": "27,362,661"
//                             },
//                             {
//                                 "Particulars": "Employee expense",
//                                 "Poush End 2082": "27,942,337",
//                                 "Poush End 2081": "27,442,614"
//                             },
//                             {
//                                 "Particulars": "Depreciation",
//                                 "Poush End 2082": "11,934,637",
//                                 "Poush End 2081": "8,539,935"
//                             },
//                             {
//                                 "Particulars": "Amortization",
//                                 "Poush End 2082": "-",
//                                 "Poush End 2081": "-"
//                             },
//                             {
//                                 "Particulars": "Operating profit / (loss)",
//                                 "Poush End 2082": "48,738,137",
//                                 "Poush End 2081": "36,211,750"
//                             },
//                             {
//                                 "Particulars": "Finance Income",
//                                 "Poush End 2082": "-",
//                                 "Poush End 2081": "-"
//                             },
//                             {
//                                 "Particulars": "Finance costs",
//                                 "Poush End 2082": "32,891,872",
//                                 "Poush End 2081": "29,664,422"
//                             },
//                             {
//                                 "Particulars": "Profit / (loss) before staff bonus",
//                                 "Poush End 2082": "15,846,265",
//                                 "Poush End 2081": "6,547,327"
//                             },
//                             {
//                                 "Particulars": "Staff bonus",
//                                 "Poush End 2082": "-",
//                                 "Poush End 2081": "-"
//                             },
//                             {
//                                 "Particulars": "Profit / (loss) before tax",
//                                 "Poush End 2082": "15,846,265",
//                                 "Poush End 2081": "6,547,327"
//                             },
//                             {
//                                 "Particulars": "Income tax expenses of current year",
//                                 "Poush End 2082": "-",
//                                 "Poush End 2081": "-"
//                             },
//                             {
//                                 "Particulars": "Income tax expenses of previous years",
//                                 "Poush End 2082": "190,167",
//                                 "Poush End 2081": "1,481,577"
//                             },
//                             {
//                                 "Particulars": "Deferred tax expenses (income)",
//                                 "Poush End 2082": "-",
//                                 "Poush End 2081": "-"
//                             },
//                             {
//                                 "Particulars": "Net profit / (loss) for the year",
//                                 "Poush End 2082": "15,656,098",
//                                 "Poush End 2081": "5,065,750"
//                             },
//                             {
//                                 "Particulars": "Other comprehensive income",
//                                 "Poush End 2082": "",
//                                 "Poush End 2081": ""
//                             },
//                             {
//                                 "Particulars": "a) Items that will be reclassified to Profit or loss",
//                                 "Poush End 2082": "-",
//                                 "Poush End 2081": "-"
//                             },
//                             {
//                                 "Particulars": "b) Items that may not be reclassified to Profit or loss",
//                                 "Poush End 2082": "-",
//                                 "Poush End 2081": "-"
//                             },
//                             {
//                                 "Particulars": "Other comprehensive income / (loss) for the year",
//                                 "Poush End 2082": "-",
//                                 "Poush End 2081": "-"
//                             },
//                             {
//                                 "Particulars": "Total comprehensive income",
//                                 "Poush End 2082": "15,656,098",
//                                 "Poush End 2081": "5,065,750"
//                             },
//                             {
//                                 "Particulars": "Profit for the Year attributable to :",
//                                 "Poush End 2082": "",
//                                 "Poush End 2081": ""
//                             },
//                             {
//                                 "Particulars": "Owner of the Company",
//                                 "Poush End 2082": "15,656,098",
//                                 "Poush End 2081": "5,065,750"
//                             },
//                             {
//                                 "Particulars": "Total Comprehensive Income attributable to :",
//                                 "Poush End 2082": "",
//                                 "Poush End 2081": ""
//                             },
//                             {
//                                 "Particulars": "Owner of the Company",
//                                 "Poush End 2082": "-",
//                                 "Poush End 2081": "-"
//                             },
//                             {
//                                 "Particulars": "Total comprehensive income",
//                                 "Poush End 2082": "15,656,098",
//                                 "Poush End 2081": "5,065,750"
//                             },
//                             {
//                                 "Particulars": "Earning per Equity share",
//                                 "Poush End 2082": "",
//                                 "Poush End 2081": ""
//                             },
//                             {
//                                 "Particulars": "Basic (NPR.)",
//                                 "Poush End 2082": "1.03",
//                                 "Poush End 2081": "0.39"
//                             },
//                             {
//                                 "Particulars": "Diluted (NPR.)",
//                                 "Poush End 2082": "1.03",
//                                 "Poush End 2081": "0.39"
//                             }
//                         ]
//                     }
//                 ]
//             },
//             "BalanceSheet": {
//                 "balance_sheet_tables": [
//                     {
//                         "table_title": "Statement of Standalone Financial Position",
//                         "columns": [
//                             "Particulars",
//                             "Poush End 2082",
//                             "Poush End 2081",
//                             ""
//                         ],
//                         "rows": [
//                             {
//                                 "Particulars": "ASSETS",
//                                 "Poush End 2082": "",
//                                 "Poush End 2081": "",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Non Current Assets",
//                                 "Poush End 2082": "",
//                                 "Poush End 2081": "",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Property,plant and equipment",
//                                 "Poush End 2082": "1,216,805,719",
//                                 "Poush End 2081": "1,066,372,556",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Capital WIP",
//                                 "Poush End 2082": "1,902,782",
//                                 "Poush End 2081": "225,835,961",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Intangible assets",
//                                 "Poush End 2082": "-",
//                                 "Poush End 2081": "-",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Financial assets",
//                                 "Poush End 2082": "",
//                                 "Poush End 2081": "",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Investments in Subsidiaries",
//                                 "Poush End 2082": "150,000,000",
//                                 "Poush End 2081": "5,600,000",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Equity investment at FV/TO/CI",
//                                 "Poush End 2082": "184,400,000",
//                                 "Poush End 2081": "50,000,000",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Other financial assets",
//                                 "Poush End 2082": "1,337,603",
//                                 "Poush End 2081": "2,085,560",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Total Non Current Assets",
//                                 "Poush End 2082": "1,554,446,104",
//                                 "Poush End 2081": "1,349,894,077",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Current Assets",
//                                 "Poush End 2082": "",
//                                 "Poush End 2081": "",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Inventories",
//                                 "Poush End 2082": "549,746,512",
//                                 "Poush End 2081": "400,690,511",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Financial assets",
//                                 "Poush End 2082": "",
//                                 "Poush End 2081": "",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Trade and other receivable",
//                                 "Poush End 2082": "637,641,068",
//                                 "Poush End 2081": "689,568,215",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Cash and cash equivalents",
//                                 "Poush End 2082": "17,319,833",
//                                 "Poush End 2081": "95,301,353",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Other current assets",
//                                 "Poush End 2082": "",
//                                 "Poush End 2081": "",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Prepaid Expenses & Advances",
//                                 "Poush End 2082": "149,234,405",
//                                 "Poush End 2081": "117,844,376",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Current Tax Assets",
//                                 "Poush End 2082": "3,297,524",
//                                 "Poush End 2081": "12,720,559",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Assets classified as held for sale",
//                                 "Poush End 2082": "-",
//                                 "Poush End 2081": "-",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Total Current Assets",
//                                 "Poush End 2082": "1,357,239,341",
//                                 "Poush End 2081": "1,316,125,014",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Total Assets",
//                                 "Poush End 2082": "2,911,685,446",
//                                 "Poush End 2081": "2,666,019,091",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "EQUITY AND LIABILITIES",
//                                 "Poush End 2082": "",
//                                 "Poush End 2081": "",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Equity",
//                                 "Poush End 2082": "",
//                                 "Poush End 2081": "",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Share Capital",
//                                 "Poush End 2082": "1,631,250,000",
//                                 "Poush End 2081": "1,305,000,000",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Reserve and surplus",
//                                 "Poush End 2082": "173,412,128",
//                                 "Poush End 2081": "10,948,268",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Share application money",
//                                 "Poush End 2082": "-",
//                                 "Poush End 2081": "-",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Total Equity",
//                                 "Poush End 2082": "1,804,662,128",
//                                 "Poush End 2081": "1,315,948,268",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Non Current Liabilities",
//                                 "Poush End 2082": "",
//                                 "Poush End 2081": "",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Financial liabilities",
//                                 "Poush End 2082": "",
//                                 "Poush End 2081": "",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Long term loan",
//                                 "Poush End 2082": "723,345,000",
//                                 "Poush End 2081": "847,745,000",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Deferred Tax Liabilities",
//                                 "Poush End 2082": "13,616,395",
//                                 "Poush End 2081": "12,167,526",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Other Non Current Liabilities",
//                                 "Poush End 2082": "-",
//                                 "Poush End 2081": "-",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Total Non Current Liabilities",
//                                 "Poush End 2082": "736,961,395",
//                                 "Poush End 2081": "859,912,526",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Current Liabilities",
//                                 "Poush End 2082": "",
//                                 "Poush End 2081": "",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Financial liabilities",
//                                 "Poush End 2082": "",
//                                 "Poush End 2081": "",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Short term loan",
//                                 "Poush End 2082": "148,240,456",
//                                 "Poush End 2081": "294,145,932",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Other financial Liabilities",
//                                 "Poush End 2082": "13,993,424",
//                                 "Poush End 2081": "11,370,302",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Trade and other Liabilities",
//                                 "Poush End 2082": "207,660,794",
//                                 "Poush End 2081": "184,473,063",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Short Term Provisions",
//                                 "Poush End 2082": "167,250",
//                                 "Poush End 2081": "169,000",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Total Current Liabilities",
//                                 "Poush End 2082": "370,061,923",
//                                 "Poush End 2081": "490,158,297",
//                                 "": ""
//                             },
//                             {
//                                 "Particulars": "Total Equity & Liabilities",
//                                 "Poush End 2082": "2,911,685,446",
//                                 "Poush End 2081": "2,666,019,091",
//                                 "": ""
//                             }
//                         ]
//                     }
//                 ]
//             },
//             "CashFlow": {
//                 "cash_flow_tables": []
//             }
//         }
//     }
// ]
let responseData = []

    for (let i = 0; i < files.length; i++) {
      
      const form = new FormData()
      form.append("file", files[i])
      form.append("tablesToExtract", JSON.stringify(extractTables))

      setLoading(true)
      try {
        const response = await fetch("/api/extraction", {
          method: "POST",
          body: form,
        })

        if (!response.ok) {
          let msg = `Request failed (${response.status}).`
          responseData.push({
            name: files[i].name,
            status: "failed",
            message: msg,
          })
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
        responseData.push({
          name: files[i].name,
          status: "success",
          data: data,
        })

        if(!extractTables.Historical){
          downloadExcel(data, extractTables, setExcel)
        }

        setSuccess("Extraction completed. You can download the Excel file now.")
      } catch (e: any) {
        setError(e?.message || "Something went wrong while extracting.")
      } finally {
        setLoading(false)
      }
    }

    if (extractTables.Historical) {
      console.log("responseData", responseData)

      try {
        const response = await fetch("/api/historicaltable", {
          method: "POST",
          body: JSON.stringify({data:responseData, tablesToExtract:extractTables}),

        }) 

        const data = await response.json()
//        const data = {
//     "ProfitAndLoss": {
//         "table_title": "Historical Profit and Loss",
//         "columns": [
//             "Particulars",
//             "Notes",
//             "F.Y. 2082-83",
//             "F.Y. 2081-82",
//             "Poush End 2082",
//             "Poush End 2081"
//         ],
//         "rows": [
//             {
//                 "Particulars": "Income",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "",
//                 "Poush End 2081": ""
//             },
//             {
//                 "Particulars": "Revenue from Operations",
//                 "Notes": "4.11",
//                 "F.Y. 2082-83": "4,77,19,213",
//                 "F.Y. 2081-82": "16,09,63,917",
//                 "Poush End 2082": "",
//                 "Poush End 2081": ""
//             },
//             {
//                 "Particulars": "Other Income",
//                 "Notes": "",
//                 "F.Y. 2082-83": "-",
//                 "F.Y. 2081-82": "-",
//                 "Poush End 2082": "3,783,981",
//                 "Poush End 2081": "4,149,697"
//             },
//             {
//                 "Particulars": "Total Income",
//                 "Notes": "",
//                 "F.Y. 2082-83": "4,77,19,213",
//                 "F.Y. 2081-82": "16,09,63,917",
//                 "Poush End 2082": "",
//                 "Poush End 2081": ""
//             },
//             {
//                 "Particulars": "Expenses",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "",
//                 "Poush End 2081": ""
//             },
//             {
//                 "Particulars": "Cost of Sales",
//                 "Notes": "4.12",
//                 "F.Y. 2082-83": "2,63,91,650",
//                 "F.Y. 2081-82": "9,98,04,646",
//                 "Poush End 2082": "763,919,497",
//                 "Poush End 2081": "452,783,310"
//             },
//             {
//                 "Particulars": "Employee Benefit Expenses",
//                 "Notes": "4.13",
//                 "F.Y. 2082-83": "53,61,000",
//                 "F.Y. 2081-82": "97,48,000",
//                 "Poush End 2082": "",
//                 "Poush End 2081": ""
//             },
//             {
//                 "Particulars": "Administrative and Operating Expenses",
//                 "Notes": "4.14",
//                 "F.Y. 2082-83": "43,83,494",
//                 "F.Y. 2081-82": "78,84,676",
//                 "Poush End 2082": "29,871,319",
//                 "Poush End 2081": "27,362,661"
//             },
//             {
//                 "Particulars": "Other Expenses",
//                 "Notes": "",
//                 "F.Y. 2082-83": "-",
//                 "F.Y. 2081-82": "-",
//                 "Poush End 2082": "",
//                 "Poush End 2081": ""
//             },
//             {
//                 "Particulars": "Finance Costs",
//                 "Notes": "4.15",
//                 "F.Y. 2082-83": "21,05,921",
//                 "F.Y. 2081-82": "1,26,85,045",
//                 "Poush End 2082": "32,891,872",
//                 "Poush End 2081": "29,664,422"
//             },
//             {
//                 "Particulars": "Depreciation and Amortization Expenses",
//                 "Notes": "4.1.2",
//                 "F.Y. 2082-83": "-",
//                 "F.Y. 2081-82": "1,83,06,538",
//                 "Poush End 2082": "",
//                 "Poush End 2081": ""
//             },
//             {
//                 "Particulars": "Total Expenses",
//                 "Notes": "",
//                 "F.Y. 2082-83": "3,82,42,065",
//                 "F.Y. 2081-82": "14,84,28,905",
//                 "Poush End 2082": "",
//                 "Poush End 2081": ""
//             },
//             {
//                 "Particulars": "Profit/(Loss) Before Tax",
//                 "Notes": "",
//                 "F.Y. 2082-83": "94,77,148",
//                 "F.Y. 2081-82": "1,25,35,012",
//                 "Poush End 2082": "15,846,265",
//                 "Poush End 2081": "6,547,327"
//             },
//             {
//                 "Particulars": "Income Tax Expense",
//                 "Notes": "",
//                 "F.Y. 2082-83": "18,95,430",
//                 "F.Y. 2081-82": "30,61,016",
//                 "Poush End 2082": "",
//                 "Poush End 2081": ""
//             },
//             {
//                 "Particulars": "Deferred Tax Expenses",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "86782",
//                 "Poush End 2082": "",
//                 "Poush End 2081": ""
//             },
//             {
//                 "Particulars": "Net Profit/(Loss) for the year",
//                 "Notes": "",
//                 "F.Y. 2082-83": "75,81,719",
//                 "F.Y. 2081-82": "93,87,214",
//                 "Poush End 2082": "15,656,098",
//                 "Poush End 2081": "5,065,750"
//             },
//             {
//                 "Particulars": "Revenue",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "878,621,946",
//                 "Poush End 2081": "548,190,573"
//             },
//             {
//                 "Particulars": "Cost of sales",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "763,919,497",
//                 "Poush End 2081": "452,783,310"
//             },
//             {
//                 "Particulars": "Gross profit / (loss)",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "114,702,449",
//                 "Poush End 2081": "95,407,263"
//             },
//             {
//                 "Particulars": "Other income",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "3,783,981",
//                 "Poush End 2081": "4,149,697"
//             },
//             {
//                 "Particulars": "Administrative expenses",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "29,871,319",
//                 "Poush End 2081": "27,362,661"
//             },
//             {
//                 "Particulars": "Employee expense",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "27,942,337",
//                 "Poush End 2081": "27,442,614"
//             },
//             {
//                 "Particulars": "Depreciation",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "11,934,637",
//                 "Poush End 2081": "8,539,935"
//             },
//             {
//                 "Particulars": "Amortization",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "-",
//                 "Poush End 2081": "-"
//             },
//             {
//                 "Particulars": "Operating profit / (loss)",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "48,738,137",
//                 "Poush End 2081": "36,211,750"
//             },
//             {
//                 "Particulars": "Finance Income",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "-",
//                 "Poush End 2081": "-"
//             },
//             {
//                 "Particulars": "Finance costs",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "32,891,872",
//                 "Poush End 2081": "29,664,422"
//             },
//             {
//                 "Particulars": "Profit / (loss) before staff bonus",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "15,846,265",
//                 "Poush End 2081": "6,547,327"
//             },
//             {
//                 "Particulars": "Staff bonus",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "-",
//                 "Poush End 2081": "-"
//             },
//             {
//                 "Particulars": "Profit / (loss) before tax",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "15,846,265",
//                 "Poush End 2081": "6,547,327"
//             },
//             {
//                 "Particulars": "Income tax expenses of current year",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "-",
//                 "Poush End 2081": "-"
//             },
//             {
//                 "Particulars": "Income tax expenses of previous years",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "190,167",
//                 "Poush End 2081": "1,481,577"
//             },
//             {
//                 "Particulars": "Deferred tax expenses (income)",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "-",
//                 "Poush End 2081": "-"
//             },
//             {
//                 "Particulars": "Net profit / (loss) for the year",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "15,656,098",
//                 "Poush End 2081": "5,065,750"
//             },
//             {
//                 "Particulars": "Other comprehensive income",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "",
//                 "Poush End 2081": ""
//             },
//             {
//                 "Particulars": "a) Items that will be reclassified to Profit or loss",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "-",
//                 "Poush End 2081": "-"
//             },
//             {
//                 "Particulars": "b) Items that may not be reclassified to Profit or loss",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "-",
//                 "Poush End 2081": "-"
//             },
//             {
//                 "Particulars": "Other comprehensive income / (loss) for the year",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "-",
//                 "Poush End 2081": "-"
//             },
//             {
//                 "Particulars": "Total comprehensive income",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "15,656,098",
//                 "Poush End 2081": "5,065,750"
//             },
//             {
//                 "Particulars": "Profit for the Year attributable to :",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "",
//                 "Poush End 2081": ""
//             },
//             {
//                 "Particulars": "Owner of the Company",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "15,656,098",
//                 "Poush End 2081": "5,065,750"
//             },
//             {
//                 "Particulars": "Total Comprehensive Income attributable to :",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "",
//                 "Poush End 2081": ""
//             },
//             {
//                 "Particulars": "Total comprehensive income",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "15,656,098",
//                 "Poush End 2081": "5,065,750"
//             },
//             {
//                 "Particulars": "Earning per Equity share",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "",
//                 "Poush End 2081": ""
//             },
//             {
//                 "Particulars": "Basic (NPR.)",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "1.03",
//                 "Poush End 2081": "0.39"
//             },
//             {
//                 "Particulars": "Diluted (NPR.)",
//                 "Notes": "",
//                 "F.Y. 2082-83": "",
//                 "F.Y. 2081-82": "",
//                 "Poush End 2082": "1.03",
//                 "Poush End 2081": "0.39"
//             }
//         ]
//     }
// }


        console.log("this is the data",data)

        

        downloadExcel(data, extractTables, setExcel)

      } catch (error) {
        console.log("this is the error",error)
      }

    }
  }



  const allChecked = selectedCount === TABLES.length
  const someChecked = selectedCount > 0 && !allChecked

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="rounded-2xl border bg-white shadow-sm">
        {/* Header */}
        <div className="flex flex-col gap-1 border-b px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900">
            PDF Financial Statement Extractor
          </h2>
          <p className="text-sm text-gray-600">
            Upload a report, choose the statements, then extract to Excel.
          </p>
        </div>

        <div className="grid gap-6 px-6 py-6 md:grid-cols-2">
          {/* Left: Dropzone */}
          <div className="">
            {files == null || files.length <= 0 ? (
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    inputRef.current?.click()
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
                  isDragging
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 bg-gray-50",
                ].join(" ")}
              >
                <input
                  ref={inputRef}
                  type="file"
                  hidden
                  // multiple={extractTables.Historical ? true : false}
                  multiple={true}
                  // accept={extractTables.Historical ? "" : accept.join(",")}
                  accept=".pdf"
                  onChange={(e) => handlePick(e.target.files)}
                />
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="rounded-full border bg-white px-3 py-1 text-xs text-gray-700">
                    PDF • Max {maxSizeMB}MB
                  </div>
                  <div className="mt-1 text-sm text-gray-700">
                    Drag & drop your file here, or{" "}
                    <span className="font-semibold text-gray-900">
                      click to browse
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Tip: cleaner (non-scanned) PDFs extract better.
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-4 flex-col overflow-hidden overflow-y-scroll max-h-[calc(100vh-20rem)]">
                {files.map((file, index) => {
                  return (
                    <div
                      className="flex items-start justify-between gap-2 p-4 group rounded-2xl border-2 border-dashed bg-blue-50  transition"
                      key={file.name}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="mt-1 text-xs text-gray-600">
                          {formatBytes(file.size)} •{" "}
                          {file.type || "unknown type"}
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                          Click here to replace the file.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          files.splice(index, 1)
                          setFiles([...files])
                        }}
                        className="shrink-0 rounded-xl border bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Remove
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

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
                  <p className="text-sm font-semibold text-gray-900">
                    Statements to extract
                  </p>
                  <p className="text-xs text-gray-600">Select one or more.</p>
                </div>

               
<label className="flex items-center gap-2 text-sm text-gray-700 select-none">
  <input
    type="checkbox"
    checked={extractTables.Historical}
    onChange={(e) => {
      const v = e.target.checked
      setExtractTables((prev) => ({
        ...prev,
        Historical: v,
      }))
    }}
    className="h-4 w-4"
  />
  Historical
</label>

<label className="flex items-center gap-2 text-sm text-gray-700 select-none">
  <input
    type="checkbox"
    checked={allChecked}
    ref={(el) => {
      if (el) el.indeterminate = someChecked
    }}
    onChange={(e) => {
      const v = e.target.checked
      setExtractTables((prev) => ({
        ...prev, // IMPORTANT: does not change Historical
        PandL: v,
        BalanceSheet: v,
        CashFlow: v,
      }))
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
                        checked
                          ? "border-blue-300 bg-blue-50 text-blue-900"
                          : "border-gray-200 bg-white text-gray-800",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setExtractTables({
                            ...extractTables,
                            [k]: e.target.checked,
                          })
                        }
                        className="h-4 w-4"
                      />
                      {k === "PandL"
                        ? "P&L"
                        : k === "BalanceSheet"
                          ? "Balance Sheet"
                          : "Cash Flow"}
                    </label>
                  )
                })}
              </div>

              <div className="mt-4 text-xs text-gray-600">
                Selected: <span className="font-semibold">{selectedCount}</span>{" "}
                / {TABLES.length}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={extract}
                disabled={
                  loading || !files || selectedCount === 0 || files.length <= 0
                }
                className={[
                  "rounded-2xl px-4 py-3 text-sm font-semibold text-white transition",
                  "shadow-sm",
                  loading || !files || selectedCount === 0 || files.length <= 0
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
                  XLSX.writeFile(
                    excel.workbook,
                    `${excel.title || "extracted"}.xlsx`,
                  )
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
                <li>
                  For best results, use non-scanned PDFs with clear tables.
                </li>
                <li>
                  If formats vary widely, expect some items to land in the
                  exceptions bucket (if you have one).
                </li>
                <li>
                  You can extend this UI to handle multiple PDFs as a batch
                  later.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 text-xs text-gray-500">
          Accepted types: {accept.length ? accept.join(", ") : "any"} • Max
          size: {maxSizeMB}MB
        </div>
      </div>
    </div>
  )
}

export default DropZone
