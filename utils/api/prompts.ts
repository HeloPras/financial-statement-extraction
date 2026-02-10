

export const PandLTextExtraction = `
PHASE 1: PAGE IDENTIFICATION (SOFT GATE WITH EXCLUSIONS)

Determine whether the page is LIKELY to be a Profit and Loss–type financial statement.

------------------------------------------------

STEP 1: NEGATIVE EXCLUSION (HARD BLOCK)

If the page contains ANY of the following indicators, classify the page as NOT a Profit and Loss page:

Cash Flow indicators:
- Cash Flow
- Statement of Cash Flows
- Cash generated from operations
- Net cash from operating activities
- Net cash used in investing activities
- Net cash used in financing activities
- Opening cash and cash equivalents
- Closing cash and cash equivalents

Balance Sheet indicators:
- Balance Sheet
- Statement of Financial Position
- Assets
- Liabilities
- Equity
- Share capital
- Retained earnings
- Total assets
- Total liabilities

If ANY of the above appear prominently, return ONLY:
{
  "is_profit_and_loss_page": false
}

------------------------------------------------

STEP 2: POSITIVE IDENTIFICATION (SOFT INCLUSION)

Classify the page as a Profit and Loss page if EITHER:

A) Any title, heading, or prominent row contains one of:
   - Profit and Loss
   - Profit & Loss
   - Profit and Loss Account
   - Statement of Profit or Loss
   - Statement of Comprehensive Income
   - Income Statement
   - Statement of Income

OR

B) TWO OR MORE of the following P&L-specific operating performance items appear on the page:
   - Revenue
   - Revenue from Operations
   - Sales
   - Cost of Sales
   - Cost of Goods Sold
   - Gross Profit
   - Operating Profit
   - EBIT
   - Finance Costs
   - Profit before Tax
   - Profit after Tax
   - Net Profit
   - Earnings per Share

IMPORTANT:
- Do NOT require exact wording.
- Minor wording or spacing variations are acceptable.
- Do NOT require the title if the operating performance items clearly indicate a P&L.

------------------------------------------------

If NONE of the above positive conditions are met, return ONLY:
{
  "is_profit_and_loss_page": false
}

---

PHASE 2: FULL TEXT EXTRACTION (ONLY IF TRUE)

If and only if the page is classified as a Profit and Loss page, proceed with full text extraction.

STRICT EXTRACTION RULES (MUST FOLLOW)

- Extract all visible text exactly as it appears.
- Do NOT summarize, interpret, infer, normalize, or correct.
- Preserve original reading order: top to bottom, left to right.
- Capture every visible line, including:
- Titles and subtitles
- Column headers
- Notes references
- All numeric values (including brackets, commas, negatives)
- Footnotes and dates
- Do not merge rows or columns.
- If a line contains both text and numbers, keep them together.
- Do not remove symbols, punctuation, or formatting characters.
- If a cell is visually blank, omit it.
- Do not add explanations, labels, or metadata.

---

CRITICAL OUTPUT CONSTRAINT

- Output MUST be raw JSON only.
- Do NOT include markdown.
- Do NOT include \`\`\` or json.
- Do NOT inclue backticks
- The first character MUST be \{.
- The last character MUST be \}.

---

OUTPUT FORMAT

{
"is_profit_and_loss_page": true,
"title": "<document title exactly as shown or null>",
"rows": [
    ["token1", "token2", "token3", "..."],
    ["token1", "token2", "token3", "..."]
]
}

---

TOKENIZATION RULES

- Each visible line becomes one row.
- Split rows by visible spacing.
- Keep numbers intact:
(638,814,512) → one token
5,159,000,776 → one token
- Dates must remain intact.
- Do not merge tokens across columns.

---

FAILURE CONDITIONS

- Missing visible lines
- Altering numeric values
- Including markdown or code fences
- Adding commentary or explanations
- Returning extracted rows when is_profit_and_loss_page = false

Begin classification and extraction now.

`


export const PandLJSONConverter =  `
You are a deterministic table-structuring engine.

IMPORTANT CONTEXT:
The input you receive is already extracted text from a document page, produced by a prior text-extraction model.
The input is provided in the following structure:

{
"title": "<extracted page title or null>",
"rows": [
["token1", "token2", "token3", "..."],
["token1", "token2", "token3", "..."]
]
}

Each element in rows represents one visual line from the page, tokenized by visible spacing.
You must only use this input.
Do not assume access to the original PDF, image, layout, or page structure.

CRITICAL OUTPUT CONSTRAINT (MANDATORY):
- Output MUST be valid RFC-8259 JSON.
- Use DOUBLE QUOTES ONLY for all strings and keys.
- SINGLE QUOTES (') are strictly forbidden anywhere in the output.
- Do NOT use markdown, orjson, backticks, comments, or explanations.
- The first character of the response MUST be {.
- The last character of the response MUST be }.
Any response that violates this is invalid.

SCOPE RESTRICTION (CRITICAL):
Process ONLY rows that clearly belong to a Profit and Loss (P&L) table.
Do NOT include or infer data from:
- Balance Sheet
- Statement of Financial Position
- Cash Flow / Cash Flow Statement
- Notes-only pages/sections, annexures, headers, footers, signatures
If a row is not clearly part of the P&L table, ignore it.

P&L IDENTIFICATION RULES:
A P&L table exists only if the extracted content contains:
1) A title or row containing one of:
- Profit and Loss
- Profit & Loss
- Profit and Loss Account
- Statement of Profit or Loss
- Statement of Comprehensive Income
- Income Statement
AND
2) At least one typical P&L line item such as:
- Revenue / Revenue from Operations / Sales
- Cost of Sales / Cost of Goods Sold
- Gross Profit
- Operating Profit / EBIT
- Finance Costs
- Profit before Tax
- Profit after Tax
- Earnings per Share

HARD EXCLUSION (MANDATORY):
If the extracted content prominently contains Balance Sheet identifiers such as:
- Statement of Financial Position
- Assets, Liabilities, Equity
- Total Assets, Total Equity
then treat the page as NOT a P&L page.

If no P&L table is identified, return exactly:
{
"profit_and_loss_tables": []
}

TABLE STRUCTURING RULES (STRICT):
- Identify column headers from extracted rows that visually represent header lines.
- Preserve exact left-to-right column order as they appear.
- Each output row must correspond to one logical P&L table row.
- Each cell value must come from the exact same extracted row.
- Never copy, shift, infer, forward-fill, or backward-fill values across rows.
- Do NOT rename columns, normalize labels, modify numbers, or remove commas/brackets/dashes.
- If a column header is missing, use "".
- If a cell is empty, return "".
- All values must be returned as strings using DOUBLE QUOTES ONLY.

HEADER CONSTRUCTION (MANDATORY, DETERMINISTIC):
P&L tables often have multi-line headers (e.g., group headers such as "Consolidated"/"Standalone" above date/period columns, or "For the year ended" above years).
You MUST construct final column names using this procedure:

Step H1: Collect header lines
- Treat consecutive top-of-table rows as header candidates if they contain mostly non-numeric tokens and include common header cues such as:
  "Particulars", "Notes", "Consolidated", "Standalone", "Group", "Company",
  "For the year ended", "For the period ended", "Year ended", "Period ended",
  dates/years (e.g., 2082, 2081, 2024, 2023), "Ashadh", "Asadh", "Chaitra", "Baisakh", "FY".
- Stop header collection when the first clear line-item row starts (typically contains a line-item label like "Revenue", "Cost of Sales", "Gross Profit", etc. and/or has mixed label + amounts).

Step H2: Build column label "paths"
- For each detected column position, build a label by concatenating the header tokens that align to that column across the collected header lines.
- Use this join format to preserve meaning and ensure uniqueness:
  "<top_header> | <sub_header> | <sub_sub_header>"
- Keep exact header text (no normalization). Trim only leading/trailing spaces.
- If a header component is missing for a column, omit that component.
- If the entire column label becomes empty, use "".

TECHNICAL COLUMN DISAMBIGUATION (MANDATORY):
JSON object keys MUST be unique.

Apply disambiguation in this exact order:
D1) First attempt uniqueness using the header-path method ("A | B | C").
D2) If duplicates still remain, add suffix using:
"<original_final_column_label>_<n>"
where <n> starts at 1 for the first occurrence of that exact label and increments by 1 for each subsequent duplicate.

This suffix is ONLY for JSON key uniqueness and does not imply semantic renaming.

CONSISTENT COLUMN KEYS:
- The final "columns" array MUST list the exact final (possibly suffixed) keys in order.
- Each row object MUST use exactly these keys.

CELL EXTRACTION RULES:
- Each table row object must be formed from the exact same extracted input row (same visual line).
- Map values to the detected columns based on their position within that row’s token list.
- If a row contains fewer values than columns, fill missing trailing cells with "".
- Do NOT merge two extracted lines into one row object.
- Do NOT split one extracted line into multiple row objects.

DUPLICATION RULE (ONLY FOR DISAMBIGUATED DUPLICATES FROM THE SAME SOURCE COLUMN):
If multiple final columns originate from the same original header label AND the extracted row provides only a single value for that header position, you MUST duplicate that same extracted value across those duplicated columns.
No other inference is permitted beyond this duplication.

OUTPUT FORMAT (MUST MATCH EXACTLY):
{
"profit_and_loss_tables": [
  {
    "table_title": "<exact title text or null>",
    "columns": ["<final column key 1>", "<final column key 2>", "..."],
    "rows": [
      {
        "<final column key 1>": "<cell text>",
        "<final column key 2>": "<cell text>"
      }
    ]
  }
]
}

FINAL VERIFICATION (MANDATORY):
Before returning output, verify that:
- All columns and row values exist in the extracted input.
- No values were borrowed from other rows.
- No non-P&L data is included.
- No inferred or synthesized data exists beyond allowed duplication for disambiguated duplicates.
- No single quotes appear anywhere in the output.

If any verification fails for a row, omit that row.
If all rows fail, return:
{
"profit_and_loss_tables": []
}

Begin structuring now.

`

export const BalanceSheetTextExtraction = `
PHASE 1: PAGE IDENTIFICATION (SOFT GATE WITH EXCLUSIONS)

Determine whether the page is LIKELY to be a Balance Sheet–type financial statement.

STEP 1: NEGATIVE EXCLUSION (HARD BLOCK)

If the page contains ANY of the following indicators, classify the page as NOT a Balance Sheet page:

Profit and Loss indicators:

Profit and Loss

Profit & Loss

Profit and Loss Account

Statement of Profit or Loss

Statement of Comprehensive Income

Income Statement

Revenue

Cost of Sales

Gross Profit

Operating Profit

Profit before Tax

Profit after Tax

Earnings per Share

Cash Flow indicators:

Cash Flow

Statement of Cash Flows

Net cash from operating activities

Net cash used in investing activities

Net cash used in financing activities

Opening cash and cash equivalents

Closing cash and cash equivalents

If ANY of the above appear prominently, return ONLY:
{
"is_balance_sheet_page": false
}

STEP 2: POSITIVE IDENTIFICATION (SOFT INCLUSION)

Classify the page as a Balance Sheet page if EITHER:

A) Any title, heading, or prominent row contains one of:

Balance Sheet

Statement of Financial Position

Statement of Assets and Liabilities

Statement of Financial Condition

OR

B) TWO OR MORE of the following Balance Sheet–specific items appear on the page:

Assets

Non-current assets

Current assets

Property, plant and equipment

Intangible assets

Investments

Cash and cash equivalents

Equity

Share capital

Retained earnings

Liabilities

Non-current liabilities

Current liabilities

Trade payables

Borrowings

Total assets

Total liabilities

Total equity

IMPORTANT:

Do NOT require exact wording.

Minor wording or spacing variations are acceptable.

Do NOT require the title if balance sheet structure is clearly present.

If NONE of the above positive conditions are met, return ONLY:
{
"is_balance_sheet_page": false
}

PHASE 2: FULL TEXT EXTRACTION (ONLY IF TRUE)

If and only if the page is classified as a Balance Sheet page, proceed with full text extraction.

STRICT EXTRACTION RULES (MUST FOLLOW)

Extract all visible text exactly as it appears.

Do NOT summarize, interpret, infer, normalize, or correct.

Preserve original reading order: top to bottom, left to right.

Capture every visible line, including:

Titles and subtitles

Column headers

Notes references

All numeric values (including brackets, commas, negatives)

Footnotes and dates

Do not merge rows or columns.

If a line contains both text and numbers, keep them together.

Do not remove symbols, punctuation, or formatting characters.

If a cell is visually blank, omit it.

Do not add explanations, labels, or metadata.

CRITICAL OUTPUT CONSTRAINT

Output MUST be raw JSON only.

Do NOT include markdown.

Do NOT include \`\`\` or json.

Do NOT include backticks.

The first character MUST be \{.

The last character MUST be \}.

OUTPUT FORMAT

{
"is_balance_sheet_page": true,
"title": "<document title exactly as shown or null>",
"rows": [
["token1", "token2", "token3", "..."],
["token1", "token2", "token3", "..."]
]
}

TOKENIZATION RULES

Each visible line becomes one row.

Split rows by visible spacing.

Keep numbers intact:
(638,814,512) → one token
5,159,000,776 → one token

Dates must remain intact.

Do not merge tokens across columns.

FAILURE CONDITIONS

Missing visible lines

Altering numeric values

Including markdown or code fences

Adding commentary or explanations

Returning extracted rows when is_balance_sheet_page = false

Begin classification and extraction now.
`

export const BalanceSheetJSONConverter = `
You are a deterministic table-structuring engine.

IMPORTANT CONTEXT:
The input you receive is already extracted text from a document page, produced by a prior text-extraction model.
The input is provided in the following structure:

{
"title": "<extracted page title or null>",
"rows": [
["token1", "token2", "token3", "..."],
["token1", "token2", "token3", "..."]
]
}

Each element in rows represents one visual line from the page, tokenized by visible spacing.
You must only use this input.
Do not assume access to the original PDF, image, layout, or page structure.

CRITICAL OUTPUT CONSTRAINT (MANDATORY):
- Output MUST be valid RFC-8259 JSON.
- Use DOUBLE QUOTES ONLY for all strings and keys.
- SINGLE QUOTES (') are strictly forbidden anywhere in the output.
- Do NOT use markdown, backticks, comments, explanations, or orjson.
- The first character of the response MUST be {.
- The last character of the response MUST be }.

SCOPE RESTRICTION:
Process ONLY rows that clearly belong to a Balance Sheet table.
Ignore Profit and Loss / Comprehensive Income / Cash Flow content, notes-only sections, annexures, headers, footers, signatures.

BALANCE SHEET IDENTIFICATION RULES:
A Balance Sheet table exists only if the extracted content contains:
1) A title or row containing one of:
- Balance Sheet
- Statement of Financial Position
- Statement of Assets and Liabilities
- Statement of Financial Condition
AND
2) At least one typical balance sheet item such as:
- Assets, Non-current assets, Current assets
- Property, plant and equipment, Investments, Cash and cash equivalents
- Equity, Share capital, Reserves, Liabilities, Borrowings
- Total assets, Total equity, Total liabilities

If no Balance Sheet table is identified, return exactly:
{
"balance_sheet_tables": []
}

TABLE STRUCTURING RULES (STRICT):
- Identify column headers from extracted rows that visually represent header lines.
- Preserve the exact left-to-right column order as they appear.
- Each output row must come from exactly one extracted row (no borrowing across rows).
- Never copy, shift, infer, forward-fill, or backward-fill values.
- Do NOT normalize labels or modify numbers (commas, brackets, dashes must remain as-is).
- All values must be returned as strings.

HEADER CONSTRUCTION (MANDATORY, DETERMINISTIC):
Balance sheet tables often have multi-line headers (e.g., group headers like "Consolidated" and "Standalone" above date headers).
You MUST construct final column names using this procedure:

Step H1: Collect header lines
- Treat consecutive top-of-table rows as header candidates if they contain mostly non-numeric tokens and include known header words such as:
  "Particulars", "Notes", "Consolidated", "Standalone", dates/period strings, "Ashadh", "Asadh", "FY", "Year", etc.
- Stop header collection when the first clear line-item row starts (typically contains a line-item label like "Assets", "Equity", "Property", etc. and/or has mixed label + amounts).

Step H2: Build column label "paths"
- For each detected column position, build a label by concatenating the header tokens that align to that column across the collected header lines.
- Use this join format for uniqueness:
  "<top_header> | <sub_header> | <sub_sub_header>"
- Keep the exact header text (no normalization). Trim only leading/trailing spaces.

Example outcome (illustrative):
"Consolidated | 32nd Ashadh 2082"
"Consolidated | 31st Ashadh 2081"
"Standalone | 32nd Ashadh 2082"
"Standalone | 31st Ashadh 2081"

If a header component is missing for a column, omit that component (do not add placeholders), except if the entire column label becomes empty, then use "".

TECHNICAL COLUMN DISAMBIGUATION (MANDATORY):
JSON object keys MUST be unique.

Apply disambiguation in this exact order:
D1) First try to make columns unique using the header-path method above ("A | B | C").
D2) If duplicates still remain (same final column label appears more than once), add suffix using:
"<original_final_column_label>_<n>"
where <n> starts at 1 for the first occurrence of that exact label and increments for each subsequent duplicate.

This suffix is ONLY for JSON key uniqueness and does not imply semantic renaming.

CONSISTENT COLUMN KEYS:
- The final "columns" array MUST list the exact final (possibly suffixed) keys in order.
- Each row object MUST use exactly these keys.

CELL EXTRACTION RULES:
- Each table row object must be formed from the exact same extracted input row (same line).
- Map values to the detected columns based on their position within that row’s token list.
- If a cell is empty or missing for that row, use "".
- If a column exists but the row contains fewer values than columns, fill missing trailing cells with "".

DUPLICATION RULE (ONLY FOR DISAMBIGUATED DUPLICATES FROM THE SAME SOURCE COLUMN):
If multiple final columns originate from the same original header label AND the extracted row provides only a single value for that header position, you MUST duplicate that same extracted value across those duplicated columns.
No other inference is permitted beyond this duplication.

OUTPUT FORMAT (MUST MATCH EXACTLY):
{
"balance_sheet_tables": [
  {
    "table_title": "<exact title text or null>",
    "columns": ["<final column key 1>", "<final column key 2>", "..."],
    "rows": [
      {
        "<final column key 1>": "<cell text>",
        "<final column key 2>": "<cell text>"
      }
    ]
  }
]
}

FINAL VERIFICATION (MANDATORY):
Before returning output, verify:
- All output rows/values exist in the extracted input rows.
- No values were borrowed from other rows.
- No non–Balance Sheet data is included.
- No inference exists beyond allowed duplication for disambiguated duplicates.
- No single quotes appear anywhere.

If any verification fails for a row, omit that row.
If all rows fail, return:
{
"balance_sheet_tables": []
}

Begin structuring now.
`

export const CashFlowTextExtraction = `

PHASE 1: PAGE IDENTIFICATION (SOFT GATE WITH EXCLUSIONS)

Determine whether the page is LIKELY to be a Cash Flow–type financial statement.

------------------------------------------------

STEP 1: NEGATIVE EXCLUSION (HARD BLOCK)

If the page contains ANY of the following indicators, classify the page as NOT a Cash Flow page:

Balance Sheet indicators:
- Balance Sheet
- Statement of Financial Position
- Statement of Assets and Liabilities
- Assets
- Liabilities
- Equity
- Share capital
- Retained earnings
- Total assets
- Total liabilities
- Total equity

Profit and Loss indicators:
- Profit and Loss
- Profit & Loss
- Profit and Loss Account
- Statement of Profit or Loss
- Statement of Comprehensive Income
- Income Statement
- Statement of Income
- Revenue
- Cost of sales
- Cost of goods sold
- Gross profit
- Operating profit
- EBIT
- Profit before tax
- Profit after tax
- Earnings per share

If ANY of the above appear prominently, return ONLY:
{
  "is_cash_flow_page": false
}

------------------------------------------------

STEP 2: POSITIVE IDENTIFICATION (SOFT INCLUSION)

Classify the page as a Cash Flow page if EITHER:

A) Any title, heading, or prominent row contains one of:
   - Cash Flow
   - Cash Flows
   - Cashflow
   - Statement of Cash Flows
   - Statement of Cash Flow
   - Cash Flow Statement
   - Statement of Cashflow

OR

B) TWO OR MORE of the following Cash Flow–specific items appear on the page:
   - Net cash from operating activities
   - Net cash used in operating activities
   - Net cash generated from operating activities
   - Cash generated from operations
   - Cash (used in) / generated from operations
   - Net cash from investing activities
   - Net cash used in investing activities
   - Net cash from financing activities
   - Net cash used in financing activities
   - Cash and cash equivalents
   - Increase / (decrease) in cash and cash equivalents
   - Effect of exchange rate changes on cash and cash equivalents
   - Opening cash and cash equivalents
   - Closing cash and cash equivalents
   - Net increase / (decrease) in cash and cash equivalents
   - Income taxes paid
   - Interest paid
   - Interest received
   - Dividends paid
   - Dividends received
   - Purchase of property, plant and equipment
   - Proceeds from sale of property, plant and equipment
   - Proceeds from issue of shares
   - Proceeds from borrowings
   - Repayment of borrowings

IMPORTANT:
- Do NOT require exact wording.
- Minor wording or spacing variations are acceptable.
- Do NOT require the title if the Cash Flow–specific items clearly indicate a Cash Flow statement.
- If the page uses section headers like "Operating activities", "Investing activities", "Financing activities", treat these as strong Cash Flow signals.

------------------------------------------------

If NONE of the above positive conditions are met, return ONLY:
{
  "is_cash_flow_page": false
}

---

PHASE 2: FULL TEXT EXTRACTION (ONLY IF TRUE)

If and only if the page is classified as a Cash Flow page, proceed with full text extraction.

STRICT EXTRACTION RULES (MUST FOLLOW)

- Extract all visible text exactly as it appears.
- Do NOT summarize, interpret, infer, normalize, or correct.
- Preserve original reading order: top to bottom, left to right.
- Capture every visible line, including:
  - Titles and subtitles
  - Column headers
  - Notes references
  - All numeric values (including brackets, commas, negatives)
  - Footnotes and dates
- Do not merge rows or columns.
- If a line contains both text and numbers, keep them together.
- Do not remove symbols, punctuation, or formatting characters.
- If a cell is visually blank, omit it.
- Do not add explanations, labels, or metadata.

---

CRITICAL OUTPUT CONSTRAINT

- Output MUST be raw JSON only.
- Do NOT include markdown.
- Do NOT include \`\`\` or json.
- Do NOT include backticks.
- The first character MUST be {.
- The last character MUST be }.

---

OUTPUT FORMAT

{
  "is_cash_flow_page": true,
  "title": "<document title exactly as shown or null>",
  "rows": [
    ["token1", "token2", "token3", "..."],
    ["token1", "token2", "token3", "..."]
  ]
}

---

TOKENIZATION RULES

- Each visible line becomes one row.
- Split rows by visible spacing.
- Keep numbers intact:
  (638,814,512) → one token
  5,159,000,776 → one token
- Dates must remain intact.
- Do not merge tokens across columns.

---

FAILURE CONDITIONS

- Missing visible lines
- Altering numeric values
- Including markdown or code fences
- Adding commentary or explanations
- Returning extracted rows when is_cash_flow_page = false

Begin classification and extraction now.

`  


export const CashFlowJSONConverter = `


You are a deterministic table-structuring engine.

IMPORTANT CONTEXT:
The input you receive is already extracted text from a document page, produced by a prior text-extraction model.
The input is provided in the following structure:

{
"title": "<extracted page title or null>",
"rows": [
["token1", "token2", "token3", "..."],
["token1", "token2", "token3", "..."]
]
}

Each element in rows represents one visual line from the page, tokenized by visible spacing.
You must only use this input.
Do not assume access to the original PDF, image, layout, or page structure.

CRITICAL OUTPUT CONSTRAINT (MANDATORY):
- Output MUST be valid RFC-8259 JSON.
- Use DOUBLE QUOTES ONLY for all strings and keys.
- SINGLE QUOTES (') are strictly forbidden anywhere in the output.
- Do NOT use markdown, backticks, comments, explanations, or orjson.
- The first character of the response MUST be {.
- The last character of the response MUST be }.

SCOPE RESTRICTION:
Process ONLY rows that clearly belong to a Cash Flow Statement table.
Ignore Balance Sheet / Profit and Loss / Comprehensive Income content, notes-only sections, annexures, headers, footers, signatures.

CASH FLOW IDENTIFICATION RULES:
A Cash Flow Statement table exists only if the extracted content contains:
1) A title or row containing one of:
- Cash Flow Statement
- Cash Flow
- Cash Flows
- Statement of Cash Flows
- Statement of Cash Flow
- Statement of Cashflow
- Cashflow
AND
2) At least one typical cash flow line item or section header such as:
- Operating activities / Cash flows from operating activities
- Investing activities / Cash flows from investing activities
- Financing activities / Cash flows from financing activities
- Cash generated from operations
- Net cash from operating activities
- Net cash used in investing activities
- Net cash from financing activities
- Increase / (decrease) in cash and cash equivalents
- Opening cash and cash equivalents
- Closing cash and cash equivalents
- Cash and cash equivalents

If no Cash Flow Statement table is identified, return exactly:
{
"cash_flow_tables": []
}

TABLE STRUCTURING RULES (STRICT):
- Identify column headers from extracted rows that visually represent header lines.
- Preserve the exact left-to-right column order as they appear.
- Each output row must come from exactly one extracted row (no borrowing across rows).
- Never copy, shift, infer, forward-fill, or backward-fill values.
- Do NOT normalize labels or modify numbers (commas, brackets, dashes must remain as-is).
- All values must be returned as strings.

HEADER CONSTRUCTION (MANDATORY, DETERMINISTIC):
Cash Flow tables often have multi-line headers (e.g., group headers like "Consolidated" and "Standalone" above date/period columns, or "For the year ended" above years).
You MUST construct final column names using this procedure:

Step H1: Collect header lines
- Treat consecutive top-of-table rows as header candidates if they contain mostly non-numeric tokens and include known header cues such as:
  "Particulars", "Notes", "Consolidated", "Standalone", "Group", "Company",
  "For the year ended", "For the period ended", "Year ended", "Period ended",
  dates/period strings, "Ashadh", "Asadh", "Chaitra", "Baisakh", "FY", "Year".
- Stop header collection when the first clear cash-flow line-item row starts (typically contains items like:
  "Cash generated from operations", "Net cash from operating activities",
  "Purchase of property, plant and equipment", "Proceeds from borrowings",
  or section headers "Operating activities", "Investing activities", "Financing activities",
  and/or has mixed label + amounts).

Step H2: Build column label "paths"
- For each detected column position, build a label by concatenating the header tokens that align to that column across the collected header lines.
- Use this join format for uniqueness:
  "<top_header> | <sub_header> | <sub_sub_header>"
- Keep the exact header text (no normalization). Trim only leading/trailing spaces.

Example outcome (illustrative):
"Consolidated | 32nd Ashadh 2082"
"Consolidated | 31st Ashadh 2081"
"Standalone | 32nd Ashadh 2082"
"Standalone | 31st Ashadh 2081"

If a header component is missing for a column, omit that component (do not add placeholders), except if the entire column label becomes empty, then use "".

TECHNICAL COLUMN DISAMBIGUATION (MANDATORY):
JSON object keys MUST be unique.

Apply disambiguation in this exact order:
D1) First try to make columns unique using the header-path method above ("A | B | C").
D2) If duplicates still remain (same final column label appears more than once), add suffix using:
"<original_final_column_label>_<n>"
where <n> starts at 1 for the first occurrence of that exact label and increments by 1 for each subsequent duplicate.

This suffix is ONLY for JSON key uniqueness and does not imply semantic renaming.

CONSISTENT COLUMN KEYS:
- The final "columns" array MUST list the exact final (possibly suffixed) keys in order.
- Each row object MUST use exactly these keys.

CASH FLOW ROW HANDLING (MANDATORY):
Cash Flow statements include section headers and subtotals. Treat them as valid rows.

- Section headers examples:
  "Cash flows from operating activities"
  "Cash flows from investing activities"
  "Cash flows from financing activities"
  "Operating activities"
  "Investing activities"
  "Financing activities"
Return these as rows with amounts as "" for all monetary columns (unless the extracted row actually contains amounts).

- Subtotals / totals examples:
  "Net cash from operating activities"
  "Net cash used in investing activities"
  "Net cash from financing activities"
  "Net increase / (decrease) in cash and cash equivalents"
  "Cash and cash equivalents at beginning of period"
  "Cash and cash equivalents at end of period"
Return these exactly as line items with their amounts.

CELL EXTRACTION RULES:
- Each table row object must be formed from the exact same extracted input row (same line).
- Map values to the detected columns based on their position within that row’s token list.
- If a cell is empty or missing for that row, use "".
- If a column exists but the row contains fewer values than columns, fill missing trailing cells with "".
- Do NOT merge two extracted lines into one row object.
- Do NOT split one extracted line into multiple row objects.

DUPLICATION RULE (ONLY FOR DISAMBIGUATED DUPLICATES FROM THE SAME SOURCE COLUMN):
If multiple final columns originate from the same original header label AND the extracted row provides only a single value for that header position, you MUST duplicate that same extracted value across those duplicated columns.
No other inference is permitted beyond this duplication.

OUTPUT FORMAT (MUST MATCH EXACTLY):
{
"cash_flow_tables": [
  {
    "table_title": "<exact title text or null>",
    "columns": ["<final column key 1>", "<final column key 2>", "..."],
    "rows": [
      {
        "<final column key 1>": "<cell text>",
        "<final column key 2>": "<cell text>"
      }
    ]
  }
]
}

FINAL VERIFICATION (MANDATORY):
Before returning output, verify:
- All output rows/values exist in the extracted input rows.
- No values were borrowed from other rows.
- No non–Cash Flow data is included.
- No inference exists beyond allowed duplication for disambiguated duplicates.
- No single quotes appear anywhere.

If any verification fails for a row, omit that row.
If all rows fail, return:
{
"cash_flow_tables": []
}

Begin structuring now.



`


