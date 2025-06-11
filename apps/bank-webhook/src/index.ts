import express from "express";
import { z } from "zod";
import db from "@repo/db/client";
const app = express();

app.use(express.json())

app.post("/hdfcWebhook", async (req, res) => {
    // Enhanced Zod validation schema
    const hdfcWebhookSchema = z.object({
        token: z.string()
            .min(1, "Token is required")
            .max(500, "Token too long"),
        user_identifier: z.string()
            .min(1, "User identifier is required")
            .refine((val) => {
                const num = Number(val);
                return !isNaN(num) && num > 0;
            }, "User identifier must be a valid positive number"),
        amount: z.string()
            .min(1, "Amount is required")
            .refine((val) => {
                const num = Number(val);
                return !isNaN(num) && num > 0 && num <= 10000000; // Max 1 crore
            }, "Amount must be a valid positive number (max 1 crore)")
    });

    // Validate request body
    const validationResult = hdfcWebhookSchema.safeParse(req.body);
    
    if (!validationResult.success) {
        return res.status(400).json({
            message: "Invalid request data",
            errors: validationResult.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message
            }))
        });
    }

    const { token, user_identifier, amount } = validationResult.data;
    
    const paymentInformation = {
        token,
        userId: user_identifier,
        amount
    };
    
    console.log(paymentInformation);
    
    try {
        // Execute everything in a single transaction with status check
        const result = await db.$transaction(async (tx) => {
            // Check if transaction exists and is in "Processing" status
            const existingTransaction = await tx.onRampTransaction.findFirst({
                where: {
                    token: paymentInformation.token,
                    status: "Processing"
                }
            });

            console.log("Found transaction:", existingTransaction);

            if (!existingTransaction) {
                throw new Error("Transaction not found or not in processing state");
            }

            // Verify the amount matches
            if (Number(existingTransaction.amount) !== Number(paymentInformation.amount)) {
                throw new Error("Amount mismatch between webhook and stored transaction");
            }

            // Verify the userId matches
            if (existingTransaction.userId !== Number(paymentInformation.userId)) {
                throw new Error("User ID mismatch between webhook and stored transaction");
            }

            // Only now update balance since all validations passed
            const balanceUpdate = await tx.balance.updateMany({
                where: {
                    userId: Number(paymentInformation.userId)
                },
                data: {
                    amount: {
                        increment: Number(paymentInformation.amount)
                    }
                }
            });

            console.log("Balance update result:", balanceUpdate);

            // Update transaction status using update instead of updateMany
            const updatedTransaction = await tx.onRampTransaction.update({
                where: {
                    token: paymentInformation.token,
                }, 
                data: {
                    status: "Success",
                }
            });

            console.log("Transaction update result:", updatedTransaction);

            return { updatedTransaction, existingTransaction, balanceUpdate };
        });

        console.log("Transaction completed successfully:", result);

        res.json({
            message: "Captured successfully",
            transactionUpdated: true,
            balanceUpdated: result.balanceUpdate.count > 0
        })
    } catch(e) {
        console.error(e);
        res.status(411).json({
            message: "Error while processing webhook"
        })
    }
})

app.listen(3003);