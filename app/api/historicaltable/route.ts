import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime"


import { NextRequest, NextResponse } from "next/server";


const client = new BedrockRuntimeClient({
  region: "us-east-1",
  requestHandler: {
    requestTimeout: 300_000, // Increase to 5 minutes for heavy multimodal tasks
  },
})








export async function POST(req:NextRequest){

    const data = await req.json()


    console.log("this is the data in historicaltale",data)

    for(let i in data){

        console.log()
    }


    return NextResponse.json({message:"success"})
}