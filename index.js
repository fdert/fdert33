import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { sendPlainTextMessage } from "./src/wsenderClient.js";

dotenv.config();
const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

app.use((req,res,next)=>{
  const key=req.headers["x-api-key"];
  if(!key || key!==API_KEY) return res.status(401).json({success:false,error:"Invalid API key"});
  next();
});

app.get("/",(req,res)=>res.json({ok:true,message:"WSender API Running"}));

app.post("/send-message", async (req,res)=>{
  try{
    const { deviceId, phone, message } = req.body;
    const result = await sendPlainTextMessage({ deviceId, phone, message });
    res.json({ success:true, result });
  }catch(err){
    res.status(500).json({ success:false, error: err.message });
  }
});

app.listen(PORT, ()=>console.log("WSender API running on port", PORT));
