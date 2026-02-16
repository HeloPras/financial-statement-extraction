import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime"


import { NextRequest, NextResponse } from "next/server";

import { HistoricalBSTablePrompt, HistoricalCFTablePrompt, HistoricalPLTablePrompt } from "@/utils/api/prompts";
import { cleanLLMJson } from "@/utils/api/helperfunctions";


const client = new BedrockRuntimeClient({
  region: "us-east-1",
  requestHandler: {
    requestTimeout: 300_000, // Increase to 5 minutes for heavy multimodal tasks
  },
})

const createHistoricalTable = async (data:any,prompt:string) => {

   const command = new ConverseCommand({
    modelId:"us.amazon.nova-2-lite-v1:0",
    messages:[
      {
        role:"user",
        content:[
          {
            text:`
${prompt}
            `
          },
          {
            text:`
              data: ${JSON.stringify(data)}   
            `
          },
        ]
      }
    ],

    inferenceConfig:{
      maxTokens:10000,
      temperature:0,
      topP:1,
    }
   })

   try {
      const response = await client.send(command)
      const rawtext = response.output?.message?.content?.[0]?.text || "{}"
      const cleanedJson = cleanLLMJson(rawtext)
      const jsonResponse = JSON.parse(cleanedJson)
      return jsonResponse
   } catch (error) {
    console.error("Error during Nova conversion:", error)
    throw error
   }
}


const historicalTableHelper = async (data: any,tablesToExtract:ExtractTableTypes ) => {

  console.log("Historical  tables conversion . . . . ") 

  let pandlResult
  let balanceSheetResult
  let cashFlowResult

  let pandlData = []
  let balanceSheetData = []
  let cashFlowData = []

  if(tablesToExtract.PandL){
    for(let i in data){
      pandlData.push(data[i].data.ProfitAndLoss.profit_and_loss_tables)
    }

    console.log("this is the pushed data",pandlData)
    let response = await createHistoricalTable(pandlData,HistoricalPLTablePrompt)
    console.log("this is the response",response) 
    pandlResult = response.historical_profit_and_loss_table

  }
  

  if(tablesToExtract.BalanceSheet){
    for(let i in data){
      balanceSheetData.push(data[i].data.BalanceSheet.balance_sheet_tables)
    }

    console.log("this is the pushed data",balanceSheetData)
    let response = await createHistoricalTable(balanceSheetData,HistoricalBSTablePrompt)
    console.log("this is the response",response) 
    balanceSheetResult = response.historical_balance_sheet_table
  }


  if(tablesToExtract.CashFlow){
    for(let i in data){
      cashFlowData.push(data[i].data.CashFlow.cash_flow_tables)
    }

    console.log("this is the pushed data",cashFlowData)
    let response = await createHistoricalTable(cashFlowData,HistoricalCFTablePrompt)
    console.log("this is the response",response) 
    cashFlowResult = response.historical_cash_flow_table
    
  }

  console.log("Historical  tables completed ✅✅✅ ") 

  return {ProfitAndLoss:pandlResult}

}





export async function POST(req:NextRequest){

    const {data,tablesToExtract} = await req.json()


    // console.log("this is the data in historicaltale",data)

    const result = await historicalTableHelper(data,tablesToExtract)


    console.log("this is the result",result)



    return NextResponse.json({ProfitAndLoss:result.ProfitAndLoss})
}