import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import * as cheerio from "cheerio";

const WSENDER_BASE = process.env.WSENDER_BASE;
const EMAIL = process.env.WSENDER_EMAIL;
const PASSWORD = process.env.WSENDER_PASSWORD;

function createClient(){
  const jar = new CookieJar();
  const client = wrapper(axios.create({
    baseURL: WSENDER_BASE,
    withCredentials: true,
    jar
  }));
  return { client, jar };
}

export async function loginWSender(){
  const { client, jar } = createClient();

  const loginPageRes = await client.get("/login");
  const $ = cheerio.load(loginPageRes.data);
  const csrfToken = $('input[name="_token"]').attr("value");
  if(!csrfToken) throw new Error("Cannot find CSRF token in /login");

  const form = new URLSearchParams();
  form.append("_token", csrfToken);
  form.append("email", EMAIL);
  form.append("password", PASSWORD);

  await client.post("/login", form.toString(), {
    headers:{ "Content-Type":"application/x-www-form-urlencoded", "Referer": WSENDER_BASE+"/login" },
    maxRedirects:0,
    validateStatus:(s)=> s===302 || (s>=200 && s<300)
  });

  return { client, jar };
}

export async function getSendPage(client){
  const res = await client.get("/user/sent-whatsapp-custom-text/plain-text", {
    headers:{ Referer: WSENDER_BASE + "/user/device" }
  });

  const $ = cheerio.load(res.data);
  const csrfToken = $('input[name="_token"]').attr("value");
  if(!csrfToken) throw new Error("Cannot find _token in send page");

  return { csrfToken };
}

export async function sendPlainTextMessage({ deviceId, phone, message }){
  if(!deviceId || !phone || !message) throw new Error("Missing fields");

  const { client } = await loginWSender();
  const { csrfToken } = await getSendPage(client);

  const form = new URLSearchParams();
  form.append("_token", csrfToken);
  form.append("device", String(deviceId));
  form.append("phone", String(phone));
  form.append("message", String(message));
  form.append("template_name", "");

  const res = await client.post("/user/sent-whatsapp-custom-text/plain-text",
    form.toString(),
    {
      headers:{
        "Content-Type":"application/x-www-form-urlencoded",
        "Referer": WSENDER_BASE + "/user/sent-whatsapp-custom-text/plain-text",
        "X-CSRF-TOKEN": csrfToken
      }
    }
  );

  return { status: res.status, data: res.data };
}
