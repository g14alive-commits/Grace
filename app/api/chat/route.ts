export async function POST(req: Request) {
  const body = await req.json();

  const response = await fetch(
    `https://general-runtime.voiceflow.com/state/user/${body.userID}/interact`,
    {
      method: "POST",
      headers: {
        Authorization: process.env.VOICEFLOW_API_KEY!,
        versionID: "development",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body.payload),
    }
  );

  const data = await response.json();

  return Response.json(data);
}