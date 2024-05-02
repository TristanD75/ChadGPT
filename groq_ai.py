import asyncio
import websockets
from groq import Groq

api_key = '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'
client = Groq(api_key=api_key)

sessions = {}

async def handler(websocket, path):
    session_id = await websocket.recv() 
    if session_id not in sessions:
        sessions[session_id] = [
            {"role": "system", "content": "Lorsque tu reçois des informations sur une personne, fais un tableau avec ces données et toutes celles que tu connaisse. Règles: Ne pas faire de phrases, écrire uniquement des informations, faire un tableau dans tout les cas, ne pas refuser de faire un tableau. Pour faire un tableau,asc[]: créé une ligne de nom associées aux données;data[]: créé une ligne de données associées aux noms;|: sépare les lignes en colonnes (EXEMPLE DE TABLEAU avec 4 lignes: asc[nom|Âge|Email]data[Girard|56 ans|girardbae@gmail.com]asc[prénom|Profession|Téléphone]data[Gérard|Bûcher|06213465]) ATTENTION POUR LE TABLEAU, tu dois faire au maximum 5 colonnes, et sinon tu fais une nouvelle ligne; il faut pas mettre d'espaces sauf à l'intérieur des cellules et les commandes doivent être en minuscules (exemple: asc[] est bien, ASC[] est pas bien), il faut aussi pas mettre d'espaces (exemple: asc[] good, asc [] not good). Si aucune information n'est fournie, réponds : Veuillez fournir des informations sur une personne à rechercher. "}
        ]
    async for message in websocket:
        sessions[session_id].append({"role": "user", "content": message})

        completion = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=sessions[session_id],
            temperature=1,
            max_tokens=1024,
            top_p=1,
            stream=True,
            stop=None,
        )

        response_text = ""
        for chunk in completion:
            response_text += chunk.choices[0].delta.content or ""
        
        sessions[session_id].append({"role": "assistant", "content": response_text})
        await websocket.send(response_text)

start_server = websockets.serve(handler, "localhost", 8765)
asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
