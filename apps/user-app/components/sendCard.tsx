"use client"
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Center } from "@repo/ui/center";
import { TextInput } from "@repo/ui/textinput";
import { useState } from "react";
import { p2pTransfer } from "../app/lib/actions/p2pTransfer";

export default function(){
    const [number,setNumber] = useState("");
    const [amount,setAmount] = useState("");

    return <div className="h-[90vh]">
                <Center>
                    <Card title="Send">

                    <div>
                        <TextInput placeholder={"Number"} label="Number" onChange={(value)=>{
                            setNumber(value)
                        }}>
                        </TextInput>

                        <TextInput placeholder={"amount"} label="Amount" onChange={(value)=>{
                            setAmount(value)
                        }}>
                        </TextInput>
                        <div className="pt-4 flex justify-cenetr">
                            <Button onClick={async()=>{
                                    await p2pTransfer(number,Number(amount)*100);
                            }}>send</Button>
                        </div>
                    </div>
                        </Card>
                </Center>
    </div>
}